// application/service/domain/derivative-domain-service.js
const Service = require('../abstract-domain-service');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
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

  static DERIVATIVE_SPECS = [
    { kind: 'thumbnail', size: 64,   format: 'webp' },
    { kind: 'thumbnail', size: 256,  format: 'webp' },
    { kind: 'preview',   size: 1024, format: 'webp' }
  ];

  constructor() {
    super();
  }

  isSupported(contentType) {
    return this.getCategory(contentType) !== null;
  }

  getCategory(contentType) {
    if (DerivativeService.IMAGE_MIME_TYPES.includes(contentType)) return 'image';
    if (DerivativeService.VIDEO_MIME_TYPES.includes(contentType)) return 'video';
    if (DerivativeService.PDF_MIME_TYPES.includes(contentType)) return 'pdf';
    if (DerivativeService.PS_MIME_TYPES.includes(contentType)) return 'postscript';
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
      const sourceBuffer = await this._produceSourceImage(category, originalBuffer, posterFrameSeconds);

      if (!sourceBuffer || sourceBuffer.length === 0) {
        console.warn(`[DerivativeService] Could not produce source image for ${fileId}`);
        return;
      }

      // Generate and store each derivative
      let generated = 0;
      for (const spec of DerivativeService.DERIVATIVE_SPECS) {
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
        } catch (specErr) {
          console.error(`[DerivativeService] Failed ${spec.kind}@${spec.size} for file ${fileId}:`, specErr.message);
          // Record the failure
          try {
            const table = this.getTable('FileDerivativeTable');
            await table.upsertDerivative({
              fileId,
              kind: spec.kind,
              spec: { format: spec.format, size: spec.size },
              storageBackendId,
              objectKey: '',
              status: 'failed',
              errorDetail: specErr.message,
              lastAttemptDt: new Date()
            });
          } catch (_) { /* best-effort */ }
        }
      }

      console.log(`[DerivativeService] Generated ${generated}/${DerivativeService.DERIVATIVE_SPECS.length} derivatives for file ${fileId}`);
    } catch (err) {
      console.error(`[DerivativeService] Failed to generate derivatives for file ${fileId}:`, err);
    }
  }

  _getPosterFrameSeconds() {
    try {
      const sm = this.getServiceManager();
      const storageProviderOption = sm.get('StorageProviderOption');
      const s3Config = (process.env.NODE_ENV === 'production')
        ? storageProviderOption.getAwsS3().getProduction()
        : storageProviderOption.getAwsS3().getDevelopment();
      const contentDefaults = s3Config.getContentDefaults();
      return contentDefaults?.getVideo()?.getPosterFrameSeconds() || 1;
    } catch {
      return 1;
    }
  }

  async _produceSourceImage(category, buffer, posterFrameSeconds) {
    switch (category) {
      case 'image':
        return buffer;
      case 'video':
        return this._extractVideoFrame(buffer, posterFrameSeconds);
      case 'pdf':
        return this._renderPdfFirstPage(buffer);
      case 'postscript':
        return this._renderPostScript(buffer);
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
    const storageUri = storageService.buildStorageUri(derivativeObjectKey);

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
      readyDt: new Date()
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

  async _streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}

module.exports = DerivativeService;
