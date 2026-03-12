#!/usr/bin/env node
// scripts/refresh-suggestions.js
//
// Refreshes the user_suggestion_cache table for all active users (or a subset).
// Computes weighted scores for folders and files, then replaces the cached rows.
//
// Usage:
//   node scripts/refresh-suggestions.js [options]
//
//   --dry-run           Score and print results without writing to the cache
//   --stale-only N      Only refresh users whose cache is older than N minutes (default: 0 = all)
//   --user ID           Only refresh a specific user_id
//   --tenant ID         Only refresh users in a specific tenant_id

'use strict';

require('dotenv').config({
  path: require('node:path').resolve(__dirname, '../.env')
});

const path = require('node:path');
globalThis.applicationPath = (relativePath) => path.join(__dirname, '../', relativePath);

const ServiceManager = require('../library/mvc/service/service-manager');
const appConfig = require('../application/config/application.config');

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function argValue(flag, defaultVal = null) {
  const idx = args.indexOf(flag);
  return idx === -1 ? defaultVal : args[idx + 1] ?? defaultVal;
}

const DRY_RUN    = args.includes('--dry-run');
const STALE_MINS = Number.parseInt(argValue('--stale-only', '0')) || 0;
const USER_ID    = argValue('--user');
const TENANT_ID  = argValue('--tenant');

// ─── Scoring queries ──────────────────────────────────────────────────────────

async function scoreFolders(adapter, userId, tenantId) {
  const result = await adapter.query(
    `SELECT
       f.folder_id,
       (
         CASE WHEN fs.folder_id IS NOT NULL THEN 100 ELSE 0 END +
         CASE WHEN f.updated_dt >= now() - interval '7 days' THEN 30 ELSE 0 END +
         CASE WHEN fe_child.folder_id IS NOT NULL THEN 20 ELSE 0 END
       ) AS score,
       jsonb_build_object(
         'starred',                   fs.folder_id IS NOT NULL,
         'recently_modified',          f.updated_dt >= now() - interval '7 days',
         'recent_child_file_activity', fe_child.folder_id IS NOT NULL
       ) AS reason
     FROM folder f
     LEFT JOIN folder_star fs
       ON fs.folder_id = f.folder_id AND fs.user_id = $1
     LEFT JOIN (
       SELECT DISTINCT fm2.folder_id
       FROM file_event fe2
       JOIN file_metadata fm2 ON fm2.file_id = fe2.file_id
       WHERE fe2.actor_user_id = $1
         AND fe2.event_type IN ('VIEWED', 'DOWNLOADED')
         AND fe2.created_dt >= now() - interval '7 days'
     ) fe_child ON fe_child.folder_id = f.folder_id
     WHERE f.tenant_id = $2
       AND f.deleted_at IS NULL
       AND f.parent_folder_id IS NOT NULL
     ORDER BY score DESC, f.updated_dt DESC NULLS LAST
     LIMIT 20`,
    [userId, tenantId]
  );
  return result.rows || result;
}

async function scoreFiles(adapter, userId, tenantId) {
  const result = await adapter.query(
    `SELECT
       fm.file_id,
       (
         CASE WHEN fs.file_id IS NOT NULL THEN 100 ELSE 0 END +
         CASE WHEN fe_view.file_id IS NOT NULL THEN 40 ELSE 0 END +
         CASE WHEN fm.updated_dt >= now() - interval '7 days' THEN 30 ELSE 0 END +
         CASE WHEN fp.file_id IS NOT NULL THEN 20 ELSE 0 END +
         10
       ) AS score,
       jsonb_build_object(
         'starred',           fs.file_id IS NOT NULL,
         'recent_view',       fe_view.file_id IS NOT NULL,
         'recently_modified', fm.updated_dt >= now() - interval '7 days',
         'shared_with_me',    fp.file_id IS NOT NULL
       ) AS reason
     FROM file_metadata fm
     LEFT JOIN file_star fs
       ON fs.file_id = fm.file_id AND fs.user_id = $1
     LEFT JOIN (
       SELECT DISTINCT file_id FROM file_event
       WHERE actor_user_id = $1
         AND event_type IN ('VIEWED', 'DOWNLOADED')
         AND created_dt >= now() - interval '7 days'
     ) fe_view ON fe_view.file_id = fm.file_id
     LEFT JOIN (
       SELECT DISTINCT file_id FROM file_permission WHERE user_id = $1
     ) fp ON fp.file_id = fm.file_id
     WHERE fm.tenant_id = $2
       AND fm.deleted_at IS NULL
       AND fm.record_status = 'upload'
       AND fm.record_sub_status = 'completed'
     ORDER BY score DESC, fm.updated_dt DESC
     LIMIT 30`,
    [userId, tenantId]
  );
  return result.rows || result;
}

// ─── Cache write ──────────────────────────────────────────────────────────────

async function writeCacheForUser(adapter, userId, tenantId, folderRows, fileRows) {
  await adapter.query(
    `DELETE FROM user_suggestion_cache WHERE tenant_id = $1 AND user_id = $2`,
    [tenantId, userId]
  );

  for (const r of folderRows) {
    await adapter.query(
      `INSERT INTO user_suggestion_cache
         (tenant_id, user_id, asset_type, asset_id, score, reason, generated_dt)
       VALUES ($1, $2, 'folder', $3, $4, $5, now())`,
      [tenantId, userId, r.folder_id, r.score, JSON.stringify(r.reason)]
    );
  }

  for (const r of fileRows) {
    await adapter.query(
      `INSERT INTO user_suggestion_cache
         (tenant_id, user_id, asset_type, asset_id, score, reason, generated_dt)
       VALUES ($1, $2, 'file', $3, $4, $5, now())`,
      [tenantId, userId, r.file_id, r.score, JSON.stringify(r.reason)]
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Suggestion Cache Refresh ===');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Mode:        ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  if (STALE_MINS) console.log(`Stale-only:  > ${STALE_MINS} minutes`);
  if (USER_ID)    console.log(`User:        ${USER_ID}`);
  if (TENANT_ID)  console.log(`Tenant:      ${TENANT_ID}`);
  console.log('');

  const sm = new ServiceManager(appConfig);

  try {
    const adapter = sm.get('DbAdapter');

    // Load active user-tenant pairs
    let sql = `
      SELECT tm.user_id, tm.tenant_id
      FROM tenant_member tm
      JOIN app_user au ON au.user_id = tm.user_id
      WHERE tm.status = 'active'
        AND au.status = 'active'
    `;
    const params = [];

    if (USER_ID) {
      params.push(USER_ID);
      sql += ` AND tm.user_id = $${params.length}`;
    }
    if (TENANT_ID) {
      params.push(TENANT_ID);
      sql += ` AND tm.tenant_id = $${params.length}`;
    }

    const membersResult = await adapter.query(sql, params);
    const members = membersResult.rows || membersResult;

    console.log(`Found ${members.length} active user-tenant pair(s).\n`);

    let refreshed = 0;
    let skipped   = 0;
    let failed    = 0;

    for (const { user_id, tenant_id } of members) {
      try {
        // Stale-only check
        if (STALE_MINS > 0) {
          const freshnessResult = await adapter.query(
            `SELECT MAX(generated_dt) AS last_generated
             FROM user_suggestion_cache
             WHERE tenant_id = $1 AND user_id = $2`,
            [tenant_id, user_id]
          );
          const lastGenerated = (freshnessResult.rows || freshnessResult)[0]?.last_generated;
          if (lastGenerated) {
            const ageMinutes = (Date.now() - new Date(lastGenerated).getTime()) / 60000;
            if (ageMinutes < STALE_MINS) {
              skipped++;
              continue;
            }
          }
        }

        const [folderRows, fileRows] = await Promise.all([
          scoreFolders(adapter, user_id, tenant_id),
          scoreFiles(adapter, user_id, tenant_id)
        ]);

        if (DRY_RUN) {
          console.log(`[dry-run] user=${user_id} tenant=${tenant_id}`);
          console.log(`  folders: ${folderRows.length} | files: ${fileRows.length}`);
          folderRows.slice(0, 4).forEach(r => console.log(`  folder ${r.folder_id} score=${r.score}`));
          fileRows.slice(0, 8).forEach(r => console.log(`  file   ${r.file_id}   score=${r.score}`));
        } else {
          await writeCacheForUser(adapter, user_id, tenant_id, folderRows, fileRows);
          console.log(`Refreshed user=${user_id} tenant=${tenant_id} | folders=${folderRows.length} files=${fileRows.length}`);
        }

        refreshed++;
      } catch (err) {
        console.error(`  Failed user=${user_id}: ${err.message}`);
        failed++;
      }
    }

    console.log(`\n=== Complete ===`);
    console.log(`  Refreshed: ${refreshed}`);
    if (skipped) console.log(`  Skipped (fresh): ${skipped}`);
    if (failed)  console.log(`  Failed:  ${failed}`);

  } catch (err) {
    console.error('Fatal error:', err);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
}

await main();
