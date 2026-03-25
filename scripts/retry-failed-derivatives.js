#!/usr/bin/env node
// scripts/retry-failed-derivatives.js
// Re-run derivative generation for files that have one or more failed derivatives.
//
// Usage:
//   node scripts/retry-failed-derivatives.js --all
//   node scripts/retry-failed-derivatives.js --tenant <tenant_id>
//   node scripts/retry-failed-derivatives.js --file <file_id>
//   node scripts/retry-failed-derivatives.js --files <id1,id2,id3>
//
// --file   targets a single file with FAILED derivative rows.
// --files  targets one or more files by ID regardless of derivative status
//          (useful when no file_derivative row exists at all).
//
// Optional flags:
//   --dry-run    Show what would be retried without generating anything
//   --limit N    Process at most N files

require('dotenv').config({
  path: require('node:path').resolve(__dirname, '../.env')
});

const path = require('node:path');
globalThis.applicationPath = (relativePath) => path.join(__dirname, '../', relativePath);

const ServiceManager = require('../library/mvc/service/service-manager');
const config = require('../application/config/application.config');

// ------------------------------------------------------------------
// Parse CLI args
// ------------------------------------------------------------------
const args = process.argv.slice(2);

const dryRun    = args.includes('--dry-run');
const modeAll   = args.includes('--all');

const tenantIdx  = args.indexOf('--tenant');
const tenantId   = tenantIdx === -1 ? null : args[tenantIdx + 1];

const fileIdx    = args.indexOf('--file');
const fileId     = fileIdx === -1 ? null : args[fileIdx + 1];

const filesIdx   = args.indexOf('--files');
const fileIds    = filesIdx === -1 ? null : (args[filesIdx + 1] || '').split(',').map(s => s.trim()).filter(Boolean);

const limitIdx   = args.indexOf('--limit');
const fileLimit  = limitIdx === -1 ? 0 : Number.parseInt(args[limitIdx + 1]) || 0;

// ------------------------------------------------------------------
// Validate
// ------------------------------------------------------------------
if (!modeAll && !tenantId && !fileId && !fileIds) {
  console.error('Error: one of --all, --tenant <id>, --file <id>, or --files <ids> is required.\n');
  console.error('Usage:');
  console.error('  node scripts/retry-failed-derivatives.js --all');
  console.error('  node scripts/retry-failed-derivatives.js --tenant <tenant_id>');
  console.error('  node scripts/retry-failed-derivatives.js --file <file_id>');
  console.error('  node scripts/retry-failed-derivatives.js --files <id1,id2,id3>');
  console.error('\nOptional:');
  console.error('  --dry-run    Preview without generating');
  console.error('  --limit N    Cap at N files');
  process.exit(1);
}

if ([modeAll, !!tenantId, !!fileId, !!fileIds].filter(Boolean).length > 1) {
  console.error('Error: --all, --tenant, --file, and --files are mutually exclusive.');
  process.exit(1);
}

if (fileIds && fileIds.length === 0) {
  console.error('Error: --files requires at least one comma-separated file ID.');
  process.exit(1);
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function printDryRun(files) {
  if (modeAll) {
    printDryRunAllTenants(files);
  } else {
    printDryRunPerFile(files);
  }
  console.log('Re-run without --dry-run to regenerate.');
}

function printDryRunAllTenants(files) {
  const byTenant = {};
  for (const f of files) {
    if (!byTenant[f.tenant_id]) byTenant[f.tenant_id] = [];
    byTenant[f.tenant_id].push(f);
  }

  let totalDerivatives = 0;
  for (const [tid, tFiles] of Object.entries(byTenant)) {
    const derivCount = tFiles.reduce((n, f) => n + (f.failed_derivatives || []).length, 0);
    totalDerivatives += derivCount;
    console.log(`Tenant: ${tid}  (${tFiles.length} file(s), ${derivCount} failed derivative(s))`);
    for (const f of tFiles) {
      console.log(`  ${f.file_id}  ${f.content_type}`);
    }
    console.log('');
  }

  console.log(`Totals : ${Object.keys(byTenant).length} tenant(s), ${files.length} file(s), ${totalDerivatives} failed derivative(s)`);
}

function printDryRunPerFile(files) {
  files.forEach((f, i) => {
    const derivs = f.failed_derivatives || [];
    console.log(`${String(i + 1).padStart(3)}. ${f.file_id}`);
    console.log(`     tenant  : ${f.tenant_id}`);
    console.log(`     type    : ${f.content_type}`);
    console.log(`     failed  : ${derivs.length} derivative(s)`);
    for (const d of derivs) {
      const spec = d.spec ? `${d.spec.format || ''}@${d.spec.size || ''}` : '?';
      const err  = d.error ? `  — ${d.error}` : '';
      console.log(`               ${d.kind} ${spec}  (${d.attempts} attempt(s))${err}`);
    }
    console.log('');
  });
}

async function processFiles(files, sm) {
  const derivativeService = sm.get('DerivativeService');
  const storageService    = sm.get('StorageService');

  let success = 0;
  let failed  = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const tag  = `[${i + 1}/${files.length}]`;

    try {
      console.log(`${tag} Retrying ${file.file_id} (${file.content_type}) tenant=${file.tenant_id} ...`);
      const backend = await storageService.getBackend(file.storage_backend_id);
      await derivativeService.generateDerivatives({
        fileId:           file.file_id,
        tenantId:         file.tenant_id,
        contentType:      file.content_type,
        backend,
        objectKey:        file.object_key,
        storageBackendId: file.storage_backend_id,
      });
      success++;
      console.log(`${tag} Done.\n`);
    } catch (err) {
      failed++;
      console.error(`${tag} FAILED: ${err.message}\n`);
    }
  }

  console.log('=== Complete ===');
  console.log(`  Success : ${success}`);
  console.log(`  Failed  : ${failed}`);
  console.log(`  Total   : ${files.length}`);
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
async function main() {
  console.log('=== Retry Failed Derivatives ===');
  console.log(`Environment : ${process.env.NODE_ENV || 'development'}`);
  if (dryRun)   console.log('Mode        : DRY RUN — nothing will be generated');
  if (modeAll)  console.log('Scope       : all tenants');
  if (tenantId) console.log(`Scope       : tenant ${tenantId}`);
  if (fileId)   console.log(`Scope       : file ${fileId}`);
  if (fileIds)  console.log(`Scope       : ${fileIds.length} file(s) by ID`);
  if (fileLimit) console.log(`Limit       : ${fileLimit} files`);
  console.log('');

  const sm = new ServiceManager(config);

  try {
    const adapter = sm.get('DbAdapter');

    let files;

    if (fileIds) {
      // --files mode: query file_metadata directly (no derivative join).
      // Works for files with no file_derivative rows at all.
      const placeholders = fileIds.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `
        SELECT fm.file_id, fm.tenant_id, fm.content_type, fm.object_key, fm.storage_backend_id
        FROM file_metadata fm
        WHERE fm.file_id IN (${placeholders})
          AND fm.deleted_at IS NULL
        ORDER BY fm.created_dt DESC
      `;
      const result = await adapter.query(sql, fileIds);
      files = result.rows || result;

      console.log(`Found ${files.length} of ${fileIds.length} file(s).\n`);

      if (files.length < fileIds.length) {
        const foundIds = new Set(files.map(f => f.file_id));
        const missing = fileIds.filter(id => !foundIds.has(id));
        console.warn(`Warning: ${missing.length} file(s) not found or deleted:`);
        missing.forEach(id => console.warn(`  ${id}`));
        console.log('');
      }
    } else {
      // Original mode: fetch files that have at least one failed derivative.
      // Aggregate failed derivative details for dry-run display.
      const params = [];

      let sql = `
        SELECT DISTINCT ON (fm.file_id)
          fm.file_id,
          fm.tenant_id,
          fm.content_type,
          fm.object_key,
          fm.storage_backend_id,
          (
            SELECT json_agg(
              json_build_object(
                'kind',     fd2.kind,
                'spec',     fd2.spec,
                'attempts', fd2.attempts,
                'error',    fd2.error_detail
              ) ORDER BY fd2.kind
            )
            FROM file_derivative fd2
            WHERE fd2.file_id = fm.file_id AND fd2.status = 'failed'
          ) AS failed_derivatives
        FROM file_metadata fm
        JOIN file_derivative fd ON fd.file_id = fm.file_id
        WHERE fd.status = 'failed'
          AND fm.deleted_at IS NULL
      `;

      if (fileId) {
        params.push(fileId);
        sql += ` AND fm.file_id = $${params.length}`;
      } else if (tenantId) {
        params.push(tenantId);
        sql += ` AND fm.tenant_id = $${params.length}`;
      }

      sql += ` ORDER BY fm.file_id, fm.created_dt DESC`;

      if (fileLimit) {
        params.push(fileLimit);
        sql += ` LIMIT $${params.length}`;
      }

      const result = await adapter.query(sql, params);
      files = result.rows || result;

      console.log(`Found ${files.length} file(s) with failed derivatives.\n`);
    }

    if (files.length === 0) {
      console.log('Nothing to retry.');
      return;
    }

    if (dryRun) {
      printDryRun(files);
      return;
    }

    await processFiles(files, sm);

  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    process.exit();
  }
}

await main();
