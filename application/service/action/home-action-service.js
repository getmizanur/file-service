// application/service/action/home-action-service.js
/* eslint-disable no-undef */
const AbstractActionService = require(globalThis.applicationPath('/application/service/abstract-action-service'));
const crypto = require('node:crypto');

class HomeActionService extends AbstractActionService {

  async list({ userEmail, identity, layoutQuery = null, sortQuery = null }) {
    const sm = this.getServiceManager();
    const folderService = sm.get('FolderService');
    const folderStarService = sm.get('FolderStarService');
    const cache = this.getCache();
    const qcs = sm.get('QueryCacheService');
    const emailHash = qcs.emailHash(userEmail);

    let profiler = null;
    try { profiler = sm.get('Profiler'); } catch { /* not available */ }
    const _t = (label, fn) => profiler?.isEnabled() ? profiler.time(label, fn, { parent: 'HomeActionService' }) : fn();

    const layoutMode = await _t('resolveLayoutMode', () => this._resolveLayoutMode(cache, userEmail, layoutQuery));
    const sortMode = await _t('resolveSortMode', () => this._resolveSortMode(cache, userEmail, sortQuery));
    const { rootFolder, tenantId } = await _t('resolveRootFolder', () => this._resolveRootFolder(qcs, folderService, userEmail, emailHash));

    const userReg = `registry:user:${emailHash}`;
    const tenantReg = tenantId ? `registry:tenant:${tenantId}` : null;
    const folderRegistries = tenantReg ? [userReg, tenantReg] : [userReg];

    const folders = await _t('fetchAllFolders', () => this._fetchAllFolders(qcs, folderService, tenantId, emailHash, folderRegistries));

    const rootFolderId = rootFolder ? (rootFolder.folder_id || null) : null;

    // Build result
    const starredFileIds = await _t('fetchStarredFileIds', () => this._fetchStarredFileIds(qcs, sm, userEmail, emailHash, userReg));

    let folderTree = [];
    try {
      folderTree = folderService.buildFolderTree(folders);
    } catch (e) {
      console.error('[HomeActionService] Error building folder tree:', e);
    }

    const starredFolderIds = await _t('fetchStarredFolderIds', () =>
      this._fetchStarredFolderIds(qcs, folderStarService, tenantId, identity, userReg));

    const expandCacheKey = `folder_expanded_state_${crypto.createHash('md5').update(userEmail).digest('hex')}`;
    const expandedFolderIds = await cache.load(expandCacheKey) || [];

    const toPlain = (item) => (typeof item.toObject === 'function' ? item.toObject() : item);

    const result = {
      viewMode: 'home',
      layoutMode,
      sortMode,
      starredFileIds,
      starredFolderIds,
      folderTree,
      currentFolderId: rootFolderId,
      rootFolderId,
      expandedFolderIds
    };

    // Fetch home suggestions
    result.homeSuggestions = await _t('fetchHomeSuggestions', () =>
      this._fetchHomeSuggestions(identity.user_id, tenantId));

    if (result.homeSuggestions) {
      this._buildLocationAnnotations(result.homeSuggestions.files, result.homeSuggestions.folders, folders, toPlain);
    }

    return result;
  }

  async _fetchHomeSuggestions(userId, tenantId) {
    if (!userId || !tenantId) return { folders: [], files: [] };

    const CACHE_TTL_MINUTES = 60;

    try {
      const sm = this.getServiceManager();
      const qcs = sm.get('QueryCacheService');
      const adapter = sm.get('DbAdapter');

      const cacheKey = `home:suggestions:${tenantId}:${userId}`;
      const tenantReg = `registry:tenant:${tenantId}`;
      return await qcs.cacheThrough(cacheKey, async () => {
        return await this._buildHomeSuggestions(adapter, sm, qcs, userId, tenantId, CACHE_TTL_MINUTES);
      }, { ttl: 30, registries: [tenantReg] });
    } catch (e) {
      console.error('[HomeActionService] Error fetching home suggestions:', e);
      return { folders: [], files: [] };
    }
  }

  async _buildHomeSuggestions(adapter, sm, qcs, userId, tenantId, CACHE_TTL_MINUTES) {
    const freshnessResult = await adapter.query(
      `SELECT MAX(generated_dt) AS last_generated
       FROM user_suggestion_cache
       WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId]
    );
    const lastGenerated = (freshnessResult.rows || freshnessResult)[0]?.last_generated;
    const isStale = !lastGenerated ||
      (Date.now() - new Date(lastGenerated).getTime()) > CACHE_TTL_MINUTES * 60 * 1000;

    if (isStale) {
      await this._refreshSuggestionCache(adapter, userId, tenantId);
    }

    const [foldersResult, filesResult] = await Promise.all([
      adapter.query(
        `SELECT usc.asset_id AS folder_id, usc.score, usc.reason,
                f.name, f.parent_folder_id, f.updated_dt,
                COALESCE(u.display_name, u.email, 'Unknown') AS owner
         FROM user_suggestion_cache usc
         JOIN folder f ON f.folder_id = usc.asset_id
         LEFT JOIN app_user u ON u.user_id = f.created_by
         WHERE usc.tenant_id = $1
           AND usc.user_id = $2
           AND usc.asset_type = 'folder'
           AND f.deleted_at IS NULL
         ORDER BY usc.score DESC, usc.generated_dt DESC
         LIMIT 4`,
        [tenantId, userId]
      ),
      adapter.query(
        `SELECT usc.asset_id AS file_id, usc.score, usc.reason,
                fm.title, fm.content_type, fm.size_bytes,
                fm.folder_id, fm.updated_dt, fm.created_dt, fm.visibility,
                fm.document_type, fm.original_filename,
                COALESCE(u.display_name, u.email, 'Unknown') AS owner
         FROM user_suggestion_cache usc
         JOIN file_metadata fm ON fm.file_id = usc.asset_id
         LEFT JOIN app_user u ON u.user_id = fm.created_by
         WHERE usc.tenant_id = $1
           AND usc.user_id = $2
           AND usc.asset_type = 'file'
           AND fm.deleted_at IS NULL
         ORDER BY usc.score DESC, usc.generated_dt DESC
         LIMIT 8`,
        [tenantId, userId]
      )
    ]);

    const folders = (foldersResult.rows || foldersResult).map(r => ({
      folder_id: r.folder_id,
      name: r.name,
      parent_folder_id: r.parent_folder_id,
      updated_dt: r.updated_dt,
      last_modified: r.updated_dt,
      owner: r.owner,
      score: Number(r.score),
      item_type: 'folder'
    }));

    const files = (filesResult.rows || filesResult).map(r => ({
      file_id: r.file_id,
      id: r.file_id,
      title: r.title,
      name: r.title,
      content_type: r.content_type,
      size_bytes: r.size_bytes,
      folder_id: r.folder_id,
      updated_dt: r.updated_dt,
      created_dt: r.created_dt,
      last_modified: r.updated_dt || r.created_dt,
      score: Number(r.score),
      visibility: r.visibility,
      document_type: r.document_type,
      original_filename: r.original_filename,
      owner: r.owner,
      item_type: 'file'
    }));

    const combined = [...folders, ...files];
    await Promise.all([
      this._populateSharedFlags(combined, sm, tenantId, qcs),
      this._populateDerivativeFlags(combined, sm, qcs, tenantId)
    ]);

    return { folders, files };
  }

  async _refreshSuggestionCache(adapter, userId, tenantId) {
    const [foldersResult, filesResult] = await Promise.all([
      adapter.query(
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
      ),
      adapter.query(
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
      )
    ]);

    const folderRows = foldersResult.rows || foldersResult;
    const fileRows   = filesResult.rows || filesResult;

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

  // ─── Private helpers ────────────────────────────────────────

  async _resolveLayoutMode(cache, userEmail, layoutQuery) {
    const layoutCacheKey = `preferences_layout_${crypto.createHash('md5').update(userEmail).digest('hex')}`;
    if (layoutQuery) {
      await cache.save(layoutQuery, layoutCacheKey);
      return layoutQuery;
    }
    const cached = await cache.load(layoutCacheKey);
    return cached || 'grid';
  }

  async _resolveSortMode(cache, userEmail, sortQuery) {
    const sortCacheKey = `preferences_sort_${crypto.createHash('md5').update(userEmail).digest('hex')}`;
    if (sortQuery) {
      await cache.save(sortQuery, sortCacheKey);
      return sortQuery;
    }
    const cached = await cache.load(sortCacheKey);
    return cached || 'name';
  }

  async _resolveRootFolder(qcs, folderService, userEmail, emailHash) {
    let rootFolder = null;
    let tenantId = null;
    try {
      const ctx = await qcs.cacheThrough(
        `folders:root:${emailHash}`,
        async () => {
          const result = await folderService.getRootFolderWithContext(userEmail);
          return {
            rootFolder: typeof result.rootFolder.toObject === 'function' ? result.rootFolder.toObject() : result.rootFolder,
            user_id: result.user_id,
            tenant_id: result.tenant_id
          };
        },
        { ttl: 3600, registries: [`registry:user:${emailHash}`] }
      );
      rootFolder = ctx.rootFolder;
      tenantId = ctx.tenant_id;
    } catch (e) {
      console.error('[HomeActionService] Error resolving root folder:', e);
    }
    return { rootFolder, tenantId };
  }

  async _fetchAllFolders(qcs, folderService, tenantId, emailHash, folderRegistries) {
    return qcs.cacheThrough(
      `folders:all:${emailHash}`,
      async () => {
        const list = await folderService.getFoldersByTenant(tenantId);
        return list.map(f => typeof f.toObject === 'function' ? f.toObject() : f);
      },
      { ttl: 120, registries: folderRegistries }
    );
  }

  async _fetchStarredFileIds(qcs, sm, userEmail, emailHash, userReg) {
    try {
      return await qcs.cacheThrough(
        `stars:files:${emailHash}`,
        async () => {
          const fileStarService = sm.get('FileStarService');
          const starredFiles = await fileStarService.getStarredFiles(userEmail);
          return starredFiles.map(sf => typeof sf.getFileId === 'function' ? sf.getFileId() : sf.file_id);
        },
        { ttl: 120, registries: [userReg] }
      );
    } catch (e) {
      console.error('[HomeActionService] Error fetching starred files:', e);
      return [];
    }
  }

  async _fetchStarredFolderIds(qcs, folderStarService, tenantId, identity, userReg) {
    try {
      const starredFolderList = await qcs.cacheThrough(
        `stars:folders:${tenantId}:${identity.user_id}`,
        async () => {
          const list = await folderStarService.listStarred(tenantId, identity.user_id);
          return list.map(f => typeof f.toObject === 'function' ? f.toObject() : f);
        },
        { ttl: 120, registries: [userReg] }
      );
      return starredFolderList.map(f => f.folder_id);
    } catch (e) {
      console.error('[HomeActionService] Error fetching starred folder IDs:', e);
      return [];
    }
  }

  _buildLocationAnnotations(plainFiles, plainSubFolders, folders, toPlain) {
    const folderMap = {};
    folders.forEach(f => {
      const pf = toPlain(f);
      folderMap[pf.folder_id] = { name: pf.name, parent_folder_id: pf.parent_folder_id };
    });

    const pathCache = {};
    const buildPath = (fid) => {
      if (!fid || !folderMap[fid]) return '';
      if (pathCache[fid]) return pathCache[fid];
      const parts = [];
      let cur = fid;
      while (cur && folderMap[cur]) {
        parts.unshift(folderMap[cur].name);
        cur = folderMap[cur].parent_folder_id;
      }
      pathCache[fid] = parts.join(' / ');
      return pathCache[fid];
    };

    plainFiles.forEach(item => {
      const fid = item.folder_id;
      item.location = (fid && folderMap[fid]) ? folderMap[fid].name : '';
      item.location_path = fid ? buildPath(fid) : '';
    });

    plainSubFolders.forEach(item => {
      const pid = item.parent_folder_id;
      item.location = (pid && folderMap[pid]) ? folderMap[pid].name : '';
      item.location_path = pid ? buildPath(pid) : '';
    });
  }
}

module.exports = HomeActionService;
