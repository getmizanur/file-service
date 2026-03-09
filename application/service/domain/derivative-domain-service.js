// application/service/domain/derivative-domain-service.js
const Service = require('../abstract-domain-service');
const { Readable } = require('node:stream');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execFileP = promisify(execFile);
const uuid = require('uuid');

class DerivativeService extends Service {

  static IMAGE_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'image/bmp', 'image/svg+xml', 'image/avif'
  ];

  static VIDEO_MIME_TYPES = [
    'video/mp4', 'video/3gpp', 'video/3gpp2', 'video/x-ms-asf',
    'video/x-msvideo', 'video/divx', 'video/mpeg', 'video/x-matroska',
    'video/quicktime', 'video/ogg', 'video/webm', 'video/x-ms-wmv',
    'video/x-m4v'
  ];

  static PDF_MIME_TYPES = ['application/pdf'];

  static PS_MIME_TYPES = ['application/postscript'];

  static DOCUMENT_MIME_TYPES = [
    'application/epub+zip',
    'application/x-hwp',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.presentation',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.text',
    'application/rtf',
    'text/rtf'
  ];

  static DOCUMENT_EXTENSION_MAP = {
    'application/epub+zip': '.epub',
    'application/x-hwp': '.hwp',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.oasis.opendocument.presentation': '.odp',
    'application/vnd.oasis.opendocument.spreadsheet': '.ods',
    'application/vnd.oasis.opendocument.text': '.odt',
    'application/rtf': '.rtf',
    'text/rtf': '.rtf'
  };

  static DERIVATIVE_SPECS = [
    { kind: 'thumbnail', size: 64,   format: 'webp' },
    { kind: 'thumbnail', size: 256,  format: 'webp' },
  ];

  static DOCUMENT_DERIVATIVE_SPECS = [
    { kind: 'thumbnail', size: 64,   format: 'webp' },
    { kind: 'thumbnail', size: 256,  format: 'webp' },
  ];

  static PREVIEW_PAGES_SPEC = { format: 'webp', max_pages: 5, width: 1400 };

  isSupported(contentType) {
    return this.getCategory(contentType) !== null;
  }

  getCategory(contentType) {
    if (DerivativeService.IMAGE_MIME_TYPES.includes(contentType)) return 'image';
    if (DerivativeService.VIDEO_MIME_TYPES.includes(contentType)) return 'video';
    if (DerivativeService.PDF_MIME_TYPES.includes(contentType)) return 'pdf';
    if (DerivativeService.PS_MIME_TYPES.includes(contentType)) return 'postscript';
    if (DerivativeService.DOCUMENT_MIME_TYPES.includes(contentType)) return 'document';
    return null;
  }

  /**
   * Generate all derivatives for a file. Fire-and-forget — never throws.
   */
  async generateDerivatives({ fileId, tenantId, contentType, backend, objectKey, storageBackendId }) {
    try {
      if (!this.isSupported(contentType)) return;

      const sm = this.getServiceManager();
      const storageService = sm.get('StorageService');

      // Resolve derivative_key_template from tenant policy
      const tenantPolicyTable = this.getTable('TenantPolicyTable');
      const policy = await tenantPolicyTable.fetchByTenantId(tenantId);
      const derivativeKeyTemplate = policy.getDerivativeKeyTemplate()
        || 'tenants/{tenant_id}/derivatives/{file_id}/{kind}_{spec}.{ext}';

      // Get posterFrameSeconds from content defaults
      const posterFrameSeconds = this._getPosterFrameSeconds();

      // Read original file into buffer (single read)
      const readStream = await storageService.read(backend, objectKey);
      const originalBuffer = await this._streamToBuffer(readStream);

      // Produce a source image buffer from the original
      const category = this.getCategory(contentType);

      // For document/postscript, cache the intermediate PDF so preview_pages can reuse it
      const intermediatePdfBuffer = await this._resolveIntermediatePdf(category, originalBuffer, contentType);

      const sourceBuffer = await this._produceSourceImageFromIntermediate(
        category, originalBuffer, intermediatePdfBuffer, posterFrameSeconds
      );

      if (!sourceBuffer || sourceBuffer.length === 0) {
        console.warn(`[DerivativeService] Could not produce source image for ${fileId}`);
        return;
      }

      const context = {
        fileId, tenantId, backend, storageBackendId,
        derivativeKeyTemplate, storageService
      };

      // Generate and store each derivative
      const generated = await this._generateSpecDerivatives(category, sourceBuffer, context);

      const specs = category === 'document'
        ? DerivativeService.DOCUMENT_DERIVATIVE_SPECS
        : DerivativeService.DERIVATIVE_SPECS;
      console.log(`[DerivativeService] Generated ${generated}/${specs.length} derivatives for file ${fileId}`);

      // Generate multi-page preview manifest for PDF-producing types
      await this._generatePreviewPagesIfApplicable(category, intermediatePdfBuffer, originalBuffer, context);
    } catch (err) {
      console.error(`[DerivativeService] Failed to generate derivatives for file ${fileId}:`, err);
    }
  }

  /**
   * Resolve the intermediate PDF buffer for document/postscript categories.
   * Returns null for other categories.
   */
  async _resolveIntermediatePdf(category, originalBuffer, contentType) {
    if (category === 'document') {
      return this._convertDocumentToPdf(originalBuffer, contentType);
    }
    if (category === 'postscript') {
      return this._convertPostScriptToPdf(originalBuffer);
    }
    return null;
  }

  /**
   * Generate and store each derivative spec, recording failures individually.
   * Returns the count of successfully generated derivatives.
   */
  async _generateSpecDerivatives(category, sourceBuffer, context) {
    const { fileId, tenantId, backend, storageBackendId, derivativeKeyTemplate, storageService } = context;

    const specs = category === 'document'
      ? DerivativeService.DOCUMENT_DERIVATIVE_SPECS
      : DerivativeService.DERIVATIVE_SPECS;

    let generated = 0;
    for (const spec of specs) {
      const specString = `${spec.format}${spec.size}`;
      const derivativeObjectKey = storageService.interpolateKeyTemplate(derivativeKeyTemplate, {
        tenant_id: tenantId,
        file_id: fileId,
        kind: spec.kind,
        spec: specString,
        ext: spec.format
      });

      try {
        await this._generateAndStore({
          sourceBuffer,
          spec,
          fileId,
          tenantId,
          backend,
          storageBackendId,
          derivativeKeyTemplate,
          storageService
        });
        generated++;
      } catch {
        console.error(`[DerivativeService] Failed ${spec.kind}@${spec.size} for file ${fileId}:`, error_.message);
        // Record the failure with the pre-computed object_key
        try {
          const table = this.getTable('FileDerivativeTable');
          await table.upsertDerivative({
            fileId,
            kind: spec.kind,
            spec: { format: spec.format, size: spec.size },
            storageBackendId,
            objectKey: derivativeObjectKey,
            status: 'failed',
            errorDetail: error_.message,
            lastAttemptDt: new Date()
          });
        } catch {
          // Intentionally ignored - upsert of failed derivative status is best-effort; original error already logged
        }
      }
    }

    return generated;
  }

  /**
   * Generate preview pages for PDF-producing categories (document, pdf, postscript).
   * No-op for other categories.
   */
  async _generatePreviewPagesIfApplicable(category, intermediatePdfBuffer, originalBuffer, context) {
    if (!['document', 'pdf', 'postscript'].includes(category)) return;

    const { fileId, tenantId, backend, storageBackendId, storageService } = context;

    try {
      // Reuse cached intermediate PDF; for raw pdf the original IS the pdf
      const pdfBuffer = intermediatePdfBuffer ?? originalBuffer;

      await this._generateAndStorePreviewPages({
        pdfBuffer, fileId, tenantId, backend, storageBackendId, storageService
      });
      console.log(`[DerivativeService] Generated preview_pages for file ${fileId}`);
    } catch (err) {
      console.error(`[DerivativeService] Failed preview_pages for file ${fileId}:`, err.message);
      try {
        const table = this.getTable('FileDerivativeTable');
        const spec = DerivativeService.PREVIEW_PAGES_SPEC;
        await table.upsertDerivative({
          fileId,
          kind: 'preview_pages',
          spec,
          storageBackendId,
          objectKey: `tenants/${tenantId}/derivatives/${fileId}/preview_pages.manifest`,
          status: 'failed',
          errorDetail: err.message,
          lastAttemptDt: new Date()
        });
      } catch {
        // Intentionally ignored - upsert of failed preview_pages status is best-effort; original error already logged above
      }
    }
  }

  _getPosterFrameSeconds() {
    try {
      const sm = this.getServiceManager();
      const config = sm.get('config');
      const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
      return config.storage_provider_option?.aws_s3?.[env]?.contentDefaults?.video?.posterFrameSeconds || 1;
    } catch {
      // Intentionally ignored - config not available; use default poster frame of 1 second
      return 1;
    }
  }

  async _produceSourceImage(category, buffer, posterFrameSeconds, contentType) {
    switch (category) {
      case 'image':
        return buffer;
      case 'video':
        return this._extractVideoFrame(buffer, posterFrameSeconds);
      case 'pdf':
        return this._renderPdfFirstPage(buffer);
      case 'postscript':
        return this._renderPostScript(buffer);
      case 'document': {
        const pdfBuffer = await this._convertDocumentToPdf(buffer, contentType);
        return this._renderPdfFirstPage(pdfBuffer);
      }
      default:
        return null;
    }
  }

  // Like _produceSourceImage but uses a pre-converted PDF buffer to avoid double-conversion
  async _produceSourceImageFromIntermediate(category, originalBuffer, pdfBuffer, posterFrameSeconds) {
    switch (category) {
      case 'image':
        return originalBuffer;
      case 'video':
        return this._extractVideoFrame(originalBuffer, posterFrameSeconds);
      case 'pdf':
        return this._renderPdfFirstPage(originalBuffer);
      case 'postscript':
      case 'document':
        return this._renderPdfFirstPage(pdfBuffer);
      default:
        return null;
    }
  }

  async _generateAndStore({ sourceBuffer, spec, fileId, tenantId, backend, storageBackendId, derivativeKeyTemplate, storageService }) {
    const sharp = require('sharp');

    const webpBuffer = await sharp(sourceBuffer)
      .resize(spec.size, spec.size, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const specString = `${spec.format}${spec.size}`;

    const derivativeObjectKey = storageService.interpolateKeyTemplate(derivativeKeyTemplate, {
      tenant_id: tenantId,
      file_id: fileId,
      kind: spec.kind,
      spec: specString,
      ext: spec.format
    });

    // Write to storage
    const derivativeStream = Readable.from(webpBuffer);
    await storageService.write(derivativeStream, backend, derivativeObjectKey, {
      sizeBytes: webpBuffer.length,
      contentType: 'image/webp'
    });

    // Build storage URI
    const storageUri = storageService.buildStorageUri(derivativeObjectKey, backend);

    // Upsert derivative record
    const table = this.getTable('FileDerivativeTable');
    await table.upsertDerivative({
      fileId,
      kind: spec.kind,
      spec: { format: spec.format, size: spec.size },
      storageBackendId,
      objectKey: derivativeObjectKey,
      storageUri,
      sizeBytes: webpBuffer.length,
      status: 'ready',
      errorDetail: null,
      lastAttemptDt: new Date(),
      readyDt: new Date(),
      processingStartedDt: new Date()
    });
  }

  // ------------------------------------------------------------------
  // Category-specific source image producers
  // ------------------------------------------------------------------

  async _extractVideoFrame(videoBuffer, posterFrameSeconds) {
    const tmpDir = os.tmpdir();
    const id = uuid.v4();
    const inputPath = path.join(tmpDir, `deriv_input_${id}.tmp`);
    const outputPath = path.join(tmpDir, `deriv_frame_${id}.png`);

    try {
      await fs.promises.writeFile(inputPath, videoBuffer);
      await execFileP('ffmpeg', [
        '-ss', String(posterFrameSeconds),
        '-i', inputPath,
        '-vframes', '1',
        '-f', 'image2',
        '-y',
        outputPath
      ]);
      return await fs.promises.readFile(outputPath);
    } finally {
      await fs.promises.unlink(inputPath).catch(() => {});
      await fs.promises.unlink(outputPath).catch(() => {});
    }
  }

  async _renderPdfPages(pdfBuffer, maxPages) {
    const tmpDir = os.tmpdir();
    const id = uuid.v4();
    const inputPath = path.join(tmpDir, `deriv_pdf_${id}.pdf`);
    const outputDir = path.join(tmpDir, `deriv_pages_${id}`);
    const outputPrefix = path.join(outputDir, 'page');

    try {
      await fs.promises.mkdir(outputDir, { recursive: true });
      await fs.promises.writeFile(inputPath, pdfBuffer);

      // Get total page count via pdfinfo (part of poppler-utils, same as pdftoppm)
      let sourcePageCount = maxPages;
      try {
        const { stdout } = await execFileP('pdfinfo', [inputPath]);
        const match = /^Pages:\s+(\d+)/m.exec(stdout);
        if (match) sourcePageCount = Number.parseInt(match[1], 10);
      } catch {
        // Intentionally ignored - pdfinfo may not be installed; fall back to default page count
      }

      const renderPages = Math.min(maxPages, sourcePageCount);

      await execFileP('pdftoppm', [
        '-png',
        '-f', '1',
        '-l', String(renderPages),
        inputPath,
        outputPrefix
      ]);

      const files = (await fs.promises.readdir(outputDir))
        .filter(f => f.endsWith('.png'))
        .sort((a, b) => a.localeCompare(b));

      const pngBuffers = await Promise.all(
        files.map(f => fs.promises.readFile(path.join(outputDir, f)))
      );

      return { pngBuffers, sourcePageCount };
    } finally {
      await fs.promises.unlink(inputPath).catch(() => {});
      await fs.promises.rm(outputDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async _generateAndStorePreviewPages({ pdfBuffer, fileId, tenantId, backend, storageBackendId, storageService }) {
    const sharp = require('sharp');
    const { Readable } = require('node:stream');
    const spec = DerivativeService.PREVIEW_PAGES_SPEC;
    const { max_pages: maxPages, width, format } = spec;

    const { pngBuffers, sourcePageCount } = await this._renderPdfPages(pdfBuffer, maxPages);

    if (!pngBuffers.length) {
      throw new Error('pdftoppm produced no pages');
    }

    const pages = [];
    let totalSizeBytes = 0;

    for (let i = 0; i < pngBuffers.length; i++) {
      const pageNum = i + 1;
      const objectKey = `tenants/${tenantId}/derivatives/${fileId}/preview_pages/${pageNum}.${format}`;

      const webpBuffer = await sharp(pngBuffers[i])
        .resize(width, null, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      await storageService.write(Readable.from(webpBuffer), backend, objectKey, {
        sizeBytes: webpBuffer.length,
        contentType: 'image/webp'
      });

      totalSizeBytes += webpBuffer.length;
      pages.push({ page: pageNum, object_key: objectKey });
    }

    const pageCount = pngBuffers.length;
    const manifest = {
      page_count: pageCount,
      source_page_count: sourcePageCount,
      truncated: sourcePageCount > pageCount,
      pages
    };

    const firstPageUri = storageService.buildStorageUri(pages[0].object_key, backend);

    const table = this.getTable('FileDerivativeTable');
    await table.upsertDerivative({
      fileId,
      kind: 'preview_pages',
      spec,
      storageBackendId,
      objectKey: `tenants/${tenantId}/derivatives/${fileId}/preview_pages.manifest`,
      storageUri: firstPageUri,
      sizeBytes: totalSizeBytes,
      manifest,
      status: 'ready',
      errorDetail: null,
      lastAttemptDt: new Date(),
      readyDt: new Date(),
      processingStartedDt: new Date()
    });
  }

  async _convertPostScriptToPdf(psBuffer) {
    const tmpDir = os.tmpdir();
    const id = uuid.v4();
    const inputPath = path.join(tmpDir, `deriv_ps_${id}.ps`);
    const outputPath = path.join(tmpDir, `deriv_ps_${id}.pdf`);

    try {
      await fs.promises.writeFile(inputPath, psBuffer);
      await execFileP('gs', [
        '-dSAFER', '-dBATCH', '-dNOPAUSE',
        '-sDEVICE=pdfwrite',
        `-sOutputFile=${outputPath}`,
        inputPath
      ]);
      return await fs.promises.readFile(outputPath);
    } finally {
      await fs.promises.unlink(inputPath).catch(() => {});
      await fs.promises.unlink(outputPath).catch(() => {});
    }
  }

  async _renderPdfFirstPage(pdfBuffer) {
    const tmpDir = os.tmpdir();
    const id = uuid.v4();
    const inputPath = path.join(tmpDir, `deriv_pdf_${id}.pdf`);
    const outputPrefix = path.join(tmpDir, `deriv_pdf_out_${id}`);

    try {
      await fs.promises.writeFile(inputPath, pdfBuffer);
      await execFileP('pdftoppm', [
        '-png',
        '-f', '1',
        '-l', '1',
        '-singlefile',
        inputPath,
        outputPrefix
      ]);
      const outPath = `${outputPrefix}.png`;
      return await fs.promises.readFile(outPath);
    } finally {
      await fs.promises.unlink(inputPath).catch(() => {});
      // Clean generated PNG
      await fs.promises.unlink(`${outputPrefix}.png`).catch(() => {});
    }
  }

  async _convertDocumentToPdf(docBuffer, contentType) {
    const tmpDir = os.tmpdir();
    const id = uuid.v4();
    const ext = DerivativeService.DOCUMENT_EXTENSION_MAP[contentType] || '.bin';
    const inputPath = path.join(tmpDir, `deriv_doc_${id}${ext}`);
    const outputDir = path.join(tmpDir, `deriv_doc_out_${id}`);

    try {
      await fs.promises.mkdir(outputDir, { recursive: true });
      await fs.promises.writeFile(inputPath, docBuffer);

      const sofficeBin = this._resolveSofficeBin();

      await execFileP(sofficeBin, [
        '--headless',
        '--norestore',
        '--convert-to', 'pdf',
        '--outdir', outputDir,
        inputPath
      ], { timeout: 60000 });

      // LibreOffice outputs <basename>.pdf in the output directory
      const baseName = path.basename(inputPath, ext);
      const pdfPath = path.join(outputDir, `${baseName}.pdf`);
      return await fs.promises.readFile(pdfPath);
    } finally {
      await fs.promises.unlink(inputPath).catch(() => {});
      await fs.promises.rm(outputDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async _renderPostScript(psBuffer) {
    const tmpDir = os.tmpdir();
    const id = uuid.v4();
    const inputPath = path.join(tmpDir, `deriv_ps_${id}.ps`);
    const outputPath = path.join(tmpDir, `deriv_ps_${id}.png`);

    try {
      await fs.promises.writeFile(inputPath, psBuffer);
      await execFileP('gs', [
        '-dSAFER', '-dBATCH', '-dNOPAUSE',
        '-sDEVICE=png16m',
        '-r150',
        '-dFirstPage=1', '-dLastPage=1',
        `-sOutputFile=${outputPath}`,
        inputPath
      ]);
      return await fs.promises.readFile(outputPath);
    } finally {
      await fs.promises.unlink(inputPath).catch(() => {});
      await fs.promises.unlink(outputPath).catch(() => {});
    }
  }

  // ------------------------------------------------------------------
  // Utility
  // ------------------------------------------------------------------

  _resolveSofficeBin() {
    try {
      const sofficeBin = this.getServiceManager().get('DerivativeOption').getSofficeBin();
      if (sofficeBin) return sofficeBin;
    } catch {
      // Intentionally ignored - DerivativeOption not registered; fall through to auto-detect soffice binary
    }
    const macPath = '/Applications/LibreOffice.app/Contents/MacOS/soffice';
    return fs.existsSync(macPath) ? macPath : 'soffice';
  }

  async _streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}

module.exports = DerivativeService;
