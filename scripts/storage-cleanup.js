#!/usr/bin/env node
// scripts/storage-cleanup.js
//
// Two-stage orphan storage cleanup.
//
// Stage 1 — detect
//   Scans each enabled storage backend, compares live object keys from the
//   database against actual objects in storage, and enqueues orphan candidates
//   in storage_cleanup_queue with a configurable grace period.
//
// Stage 2 — delete
//   Deletes queued objects whose delete_after_dt has elapsed and marks them
//   as deleted. Run with --delete-ready to run both stages in one invocation.
//
// Usage:
//   node scripts/storage-cleanup.js [options]
//
//   --dry-run           Detect only — do not write to queue or delete anything
//   --grace-days N      Days before an orphan is eligible for deletion (default: 7)
//   --delete-ready      Also execute stage 2 in the same run
//   --backend ID        Only process a specific storage_backend_id
//   --limit N           Cap orphan candidates written per backend (default: unlimited)

'use strict';

require('dotenv').config({
  path: require('node:path').resolve(__dirname, '../.env')
});

const path = require('node:path');
globalThis.applicationPath = (relativePath) => path.join(__dirname, '../', relativePath);

const fs = require('node:fs');
const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const ServiceManager = require('../library/mvc/service/service-manager');
const appConfig = require('../application/config/application.config');

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function argValue(flag, defaultVal = null) {
  const idx = args.indexOf(flag);
  return idx === -1 ? defaultVal : args[idx + 1] ?? defaultVal;
}

const DRY_RUN      = args.includes('--dry-run');
const DELETE_READY = args.includes('--delete-ready');
const GRACE_DAYS   = Number.parseInt(argValue('--grace-days', '7')) || 7;
const BACKEND_ID   = argValue('--backend');
const LIMIT        = Number.parseInt(argValue('--limit', '0')) || 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseConfig(raw) {
  if (typeof raw === 'object' && raw !== null) return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

function cleanPrefix(raw) {
  let p = (raw || '').replace(/^\/+/, '').replace(/\/?\*$/, '').replace(/\/+$/, '');
  if (p) p += '/';
  return p;
}

function graceDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// ─── S3 helpers ──────────────────────────────────────────────────────────────

const s3ClientCache = {};

function getS3Client(region) {
  if (!s3ClientCache[region]) {
    s3ClientCache[region] = new S3Client({ region });
  }
  return s3ClientCache[region];
}

/**
 * List all object keys under prefix in bucket.
 * Returns an array of keys with the prefix stripped (matching DB object_key format).
 */
async function listS3Keys(config) {
  const { region, bucket } = config;
  const prefix = cleanPrefix(config.prefix);
  const client = getS3Client(region);
  const keys = [];
  let continuationToken;

  do {
    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix || undefined,
      ContinuationToken: continuationToken
    });
    const resp = await client.send(cmd);
    for (const obj of resp.Contents || []) {
      // Strip prefix to get DB-style key
      const key = prefix ? obj.Key.slice(prefix.length) : obj.Key;
      if (key) keys.push(key);
    }
    continuationToken = resp.IsTruncated ? resp.NextContinuationToken : null;
  } while (continuationToken);

  return keys;
}

async function deleteS3Key(config, objectKey) {
  const { region, bucket } = config;
  const prefix = cleanPrefix(config.prefix);
  const client = getS3Client(region);
  const s3Key = prefix ? `${prefix}${objectKey}` : objectKey;
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: s3Key }));
}

// ─── Local FS helpers ─────────────────────────────────────────────────────────

/**
 * Recursively list all file paths under rootDir.
 * Returns keys relative to rootDir (matching DB object_key format).
 */
async function listLocalKeys(rootDir) {
  const keys = [];

  async function walk(dir) {
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        // Return POSIX-style relative key (matching DB storage)
        keys.push(path.relative(rootDir, full).replaceAll(path.sep, '/'));
      }
    }
  }

  await walk(rootDir);
  return keys;
}

async function deleteLocalKey(rootDir, objectKey) {
  const fullPath = path.join(rootDir, objectKey);
  await fs.promises.unlink(fullPath);

  // Remove empty parent directories (best-effort)
  let dir = path.dirname(fullPath);
  while (dir !== rootDir && dir.startsWith(rootDir)) {
    try {
      const remaining = await fs.promises.readdir(dir);
      if (remaining.length === 0) {
        await fs.promises.rmdir(dir);
        dir = path.dirname(dir);
      } else {
        break;
      }
    } catch {
      break;
    }
  }
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

/**
 * Build the Set of live object_keys for a given storage backend.
 * Includes keys from file_metadata and file_derivative.
 */
async function fetchLiveKeys(adapter, backendId) {
  const result = await adapter.query(
    `SELECT object_key
     FROM file_metadata
     WHERE storage_backend_id = $1 AND object_key IS NOT NULL
     UNION
     SELECT object_key
     FROM file_derivative
     WHERE storage_backend_id = $1 AND object_key IS NOT NULL`,
    [backendId]
  );
  const rows = result.rows || result;
  return new Set(rows.map(r => r.object_key));
}

/**
 * Enqueue an orphan candidate if not already pending in the queue.
 */
async function enqueueOrphan(adapter, backendId, objectKey, reason, deleteAfterDt) {
  await adapter.query(
    `INSERT INTO storage_cleanup_queue
       (storage_backend_id, object_key, reason, delete_after_dt)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (storage_backend_id, object_key) DO NOTHING`,
    [backendId, objectKey, reason, deleteAfterDt]
  );
}

// ─── Stage 1 — detect ────────────────────────────────────────────────────────

async function runDetect(adapter, backends) {
  let totalOrphans = 0;
  let totalEnqueued = 0;

  for (const backend of backends) {
    const id       = backend.storage_backend_id;
    const provider = backend.provider;
    const config   = parseConfig(backend.config);

    console.log(`\n[Detect] Backend: ${id} (${provider})`);

    let storageKeys;
    try {
      if (provider === 'aws_s3') {
        storageKeys = await listS3Keys(config);
      } else if (provider === 'local_fs') {
        const rootPath = config.root_path || './storage';
        const resolvedRoot = path.resolve(globalThis.applicationPath(''), rootPath);
        storageKeys = await listLocalKeys(resolvedRoot);
      } else {
        console.log(`  Skipping unsupported provider: ${provider}`);
        continue;
      }
    } catch (err) {
      console.error(`  Failed to list storage objects: ${err.message}`);
      continue;
    }

    console.log(`  Storage objects: ${storageKeys.length}`);

    const liveKeys = await fetchLiveKeys(adapter, id);
    console.log(`  Live DB keys:    ${liveKeys.size}`);

    const deleteAfterDt = graceDate(GRACE_DAYS);
    let backendOrphans = 0;
    let backendEnqueued = 0;

    for (const key of storageKeys) {
      if (liveKeys.has(key)) continue;

      backendOrphans++;
      totalOrphans++;

      if (DRY_RUN) {
        console.log(`  [dry-run] orphan: ${key}`);
        continue;
      }

      if (LIMIT > 0 && backendEnqueued >= LIMIT) break;

      await enqueueOrphan(adapter, id, key, 'not_referenced_in_db', deleteAfterDt);
      backendEnqueued++;
      totalEnqueued++;
    }

    if (DRY_RUN) {
      console.log(`  Orphans found (dry-run, not queued): ${backendOrphans}`);
    } else {
      console.log(`  Orphans found: ${backendOrphans} | Newly enqueued: ${backendEnqueued}`);
    }
  }

  console.log(`\nDetect complete — orphans found: ${totalOrphans} | enqueued: ${DRY_RUN ? '(dry-run)' : totalEnqueued}`);
}

// ─── Stage 2 — delete ────────────────────────────────────────────────────────

async function runDelete(adapter, backends) {
  const backendMap = {};
  for (const b of backends) {
    backendMap[b.storage_backend_id] = b;
  }

  const result = await adapter.query(
    `SELECT cleanup_id, storage_backend_id, object_key, reason, detected_dt
     FROM storage_cleanup_queue
     WHERE status = 'pending' AND delete_after_dt <= now()
     ORDER BY detected_dt ASC`
  );
  const rows = result.rows || result;

  console.log(`\n[Delete] ${rows.length} object(s) ready for deletion.`);

  let success = 0;
  let failed  = 0;

  for (const row of rows) {
    const backend = backendMap[row.storage_backend_id];
    if (!backend) {
      console.warn(`  Skipping ${row.object_key} — backend ${row.storage_backend_id} not found`);
      continue;
    }

    const provider = backend.provider;
    const config   = parseConfig(backend.config);

    try {
      if (DRY_RUN) {
        console.log(`  [dry-run] would delete: ${row.object_key} (${provider})`);
        continue;
      }

      if (provider === 'aws_s3') {
        await deleteS3Key(config, row.object_key);
      } else if (provider === 'local_fs') {
        const rootPath = config.root_path || './storage';
        const resolvedRoot = path.resolve(globalThis.applicationPath(''), rootPath);
        await deleteLocalKey(resolvedRoot, row.object_key);
      } else {
        console.warn(`  Unsupported provider for delete: ${provider}`);
        continue;
      }

      await adapter.query(
        `UPDATE storage_cleanup_queue
         SET status = 'deleted', deleted_dt = now()
         WHERE cleanup_id = $1`,
        [row.cleanup_id]
      );

      console.log(`  Deleted: ${row.object_key}`);
      success++;
    } catch (err) {
      console.error(`  Failed to delete ${row.object_key}: ${err.message}`);
      failed++;
    }
  }

  if (!DRY_RUN) {
    console.log(`\nDelete complete — success: ${success} | failed: ${failed}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Storage Cleanup Script ===');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Mode:        ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Grace days:  ${GRACE_DAYS}`);
  console.log(`Stages:      detect${DELETE_READY ? ' + delete' : ' only'}`);
  if (BACKEND_ID) console.log(`Backend:     ${BACKEND_ID}`);
  if (LIMIT) console.log(`Limit:       ${LIMIT} orphans per backend`);
  console.log('');

  const sm = new ServiceManager(appConfig);

  try {
    const adapter = sm.get('DbAdapter');

    // Load storage backends
    let sql = `SELECT storage_backend_id, provider, config FROM storage_backend WHERE is_enabled = true`;
    const params = [];
    if (BACKEND_ID) {
      sql += ` AND storage_backend_id = $1`;
      params.push(BACKEND_ID);
    }

    const backendsResult = await adapter.query(sql, params);
    const backends = backendsResult.rows || backendsResult;

    if (backends.length === 0) {
      console.log('No enabled storage backends found.');
      return;
    }

    console.log(`Found ${backends.length} enabled storage backend(s).`);

    await runDetect(adapter, backends);

    if (DELETE_READY) {
      await runDelete(adapter, backends);
    } else {
      console.log('\nStage 2 (delete) skipped. Run with --delete-ready to enable.');
    }

  } catch (err) {
    console.error('Fatal error:', err);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
}

await main();
