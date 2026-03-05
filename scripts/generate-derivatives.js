#!/usr/bin/env node
// scripts/generate-derivatives.js
// One-time script to generate thumbnails/previews for existing uploaded files.
//
// Usage: node scripts/generate-derivatives.js [options]
//   --dry-run       Show what would be processed without generating
//   --limit N       Process at most N files (default: all)
//   --tenant ID     Only process files for a specific tenant

require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env')
});

const path = require('path');
global.applicationPath = (relativePath) => path.join(__dirname, '../', relativePath);

const ServiceManager = require('../library/mvc/service/service-manager');
const config = require('../application/config/application.config');
const DerivativeService = require('../application/service/domain/derivative-domain-service');

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const fileLimit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) || 0 : 0;
const tenantIdx = args.indexOf('--tenant');
const tenantFilter = tenantIdx !== -1 ? args[tenantIdx + 1] : null;

const SUPPORTED_TYPES = [
  ...DerivativeService.IMAGE_MIME_TYPES,
  ...DerivativeService.VIDEO_MIME_TYPES,
  ...DerivativeService.PDF_MIME_TYPES,
  ...DerivativeService.PS_MIME_TYPES,
];

async function main() {
  console.log('=== Derivative Generation Script ===');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (dryRun) console.log('MODE: DRY RUN — no derivatives will be generated');
  if (fileLimit) console.log(`Limit: ${fileLimit} files`);
  if (tenantFilter) console.log(`Tenant: ${tenantFilter}`);
  console.log('');

  const sm = new ServiceManager(config);

  try {
    const adapter = sm.get('DbAdapter');

    // Find completed files with supported content types that have no derivatives yet
    let sql = `
      SELECT fm.file_id, fm.tenant_id, fm.content_type, fm.object_key, fm.storage_backend_id
      FROM file_metadata fm
      WHERE fm.record_status = 'completed'
        AND fm.deleted_at IS NULL
        AND fm.content_type = ANY($1)
        AND NOT EXISTS (
          SELECT 1 FROM file_derivative fd WHERE fd.file_id = fm.file_id
        )
    `;
    const params = [SUPPORTED_TYPES];

    if (tenantFilter) {
      sql += ` AND fm.tenant_id = $${params.length + 1}`;
      params.push(tenantFilter);
    }

    sql += ` ORDER BY fm.created_dt DESC`;

    if (fileLimit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(fileLimit);
    }

    const result = await adapter.query(sql, params);
    const files = result.rows || result;

    console.log(`Found ${files.length} file(s) needing derivatives.\n`);

    if (files.length === 0) {
      console.log('Nothing to do.');
      return;
    }

    if (dryRun) {
      files.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.file_id} | ${f.content_type} | tenant=${f.tenant_id}`);
      });
      console.log('\nRe-run without --dry-run to generate derivatives.');
      return;
    }

    const derivativeService = sm.get('DerivativeService');
    const storageService = sm.get('StorageService');

    let success = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tag = `[${i + 1}/${files.length}]`;

      try {
        console.log(`${tag} Processing ${file.file_id} (${file.content_type})...`);

        const backend = await storageService.getBackend(file.storage_backend_id);

        await derivativeService.generateDerivatives({
          fileId: file.file_id,
          tenantId: file.tenant_id,
          contentType: file.content_type,
          backend,
          objectKey: file.object_key,
          storageBackendId: file.storage_backend_id,
        });

        success++;
        console.log(`${tag} Done.`);
      } catch (err) {
        failed++;
        console.error(`${tag} FAILED: ${err.message}`);
      }
    }

    console.log(`\n=== Complete ===`);
    console.log(`  Success: ${success}`);
    console.log(`  Failed:  ${failed}`);
    console.log(`  Total:   ${files.length}`);

  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    process.exit();
  }
}

main();
