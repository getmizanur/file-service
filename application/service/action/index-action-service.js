// application/service/action/index-action-service.js
/* eslint-disable no-undef */
const AbstractActionService = require(globalThis.applicationPath('/application/service/abstract-action-service'));
const SearchQueryParser = require(globalThis.applicationPath('/application/util/search-query-parser'));
const crypto = require('node:crypto');

class IndexActionService extends AbstractActionService {

  /**
   * Resolve all data needed to render the main listing view.
   *
   * @param {object} params
   * @param {string} params.userEmail
   * @param {object} params.identity  - auth identity (has user_id)
   * @param {string|null} params.folderId  - current folder from query string
   * @param {object} params.rawQuery  - full query string object for input filter
   * @returns {object} view data
   */
  async list({ userEmail, identity, folderId, viewMode = 'my-drive', layoutQuery = null, sortQuery = null, searchQuery = null, page = 1 }) {
    const sm = this.getServiceManager();
    const folderService = sm.get('FolderService');
    const fileMetadataService = sm.get('FileMetadataService');
    const folderStarService = sm.get('FolderStarService');
    const cache = this.getCache();
    const qcs = sm.get('QueryCacheService');
    const emailHash = qcs.emailHash(userEmail);
    const pageSize = 25;

    const layoutMode = await this._resolveLayoutMode(cache, userEmail, layoutQuery);
    const sortMode = await this._resolveSortMode(cache, userEmail, sortQuery);

    const { rootFolder, tenantId } = await this._resolveRootFolder(qcs, folderService, userEmail, emailHash);

    const userReg = `registry:user:${emailHash}`;
    const tenantReg = tenantId ? `registry:tenant:${tenantId}` : null;
    const folderRegistries = tenantReg ? [userReg, tenantReg] : [userReg];

    const folders = await this._fetchAllFolders(qcs, folderService, tenantId, emailHash, folderRegistries);

    const { currentFolderId, rootFolderId } = this._resolveCurrentFolder(folderId, rootFolder, folders, userEmail);

    // --- Files + subfolders by view mode ---
    const viewCtx = { sm, qcs, folderService, fileMetadataService, folderStarService, tenantId, emailHash, userEmail, identity, userReg, tenantReg, currentFolderId, pageSize, page, sortMode };
    const { subFolders, filesList, pagination } = await this._fetchViewData(viewMode, searchQuery, viewCtx);

    // --- Starred file IDs (cached) ---
    const starredFileIds = await this._fetchStarredFileIds(qcs, sm, userEmail, emailHash, userReg);

    // Starred view: fetch full file objects
    const resolvedFilesList = viewMode === 'starred'
      ? await this._fetchStarredFileDetails(fileMetadataService, starredFileIds)
      : filesList;

    // --- Folder tree (sidebar) ---
    let folderTree = [];
    try {
      folderTree = folderService.buildFolderTree(folders);
    } catch (e) {
      console.error('[IndexActionService] Error building folder tree:', e);
    }

    // --- Starred folder IDs for UI highlight (cached) ---
    const starredFolderIds = await this._fetchStarredFolderIds(viewMode, subFolders, qcs, folderStarService, tenantId, identity, userReg);

    // --- Expanded folder state ---
    const expandCacheKey = `folder_expanded_state_${crypto.createHash('md5').update(userEmail).digest('hex')}`;
    const expandedFolderIds = await cache.load(expandCacheKey) || [];

    // Normalize entities to plain objects
    const toPlain = (item) => (typeof item.toObject === 'function' ? item.toObject() : item);

    const plainFiles = resolvedFilesList.map(toPlain);
    const plainSubFolders = viewMode === 'shared-with-me' ? [] : subFolders.map(toPlain);

    const locationViews = ['search', 'trash', 'starred', 'recent', 'shared-with-me', 'my-drive'];
    if (locationViews.includes(viewMode)) {
      this._buildLocationAnnotations(plainFiles, plainSubFolders, folders, toPlain);
    }

    // Merged array for unified layout helpers (folders first, then files)
    const mergedItems = [
      ...plainSubFolders.map(f => ({ ...f, item_type: 'folder' })),
      ...plainFiles.map(f => ({ ...f, item_type: f.item_type || 'file' }))
    ];

    await this._populateSharedFlags(mergedItems, sm, tenantId);
    await this._populateDerivativeFlags(mergedItems, sm);
    this._sortMergedItems(mergedItems, sortMode);

    // --- Breadcrumb trail ---
    const breadcrumbs = this._buildBreadcrumbs(currentFolderId, rootFolderId, folders.map(toPlain));

    const homeSuggestions = viewMode === 'home'
      ? await this._fetchHomeSuggestions(identity.user_id, tenantId)
      : null;

    if (homeSuggestions) {
      this._buildLocationAnnotations(homeSuggestions.files, homeSuggestions.folders, folders, toPlain);
    }

    return {
      viewMode,
      layoutMode,
      sortMode,
      searchQuery,
      pagination,
      folders: folders.map(toPlain),
      filesList: plainFiles,
      subFolders: plainSubFolders,
      mergedItems,
      starredFileIds,
      starredFolderIds,
      folderTree,
      currentFolderId,
      rootFolderId,
      expandedFolderIds,
      breadcrumbs,
      homeSuggestions
    };
  }

  // ─── Private helper methods ────────────────────────────────────────

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
      console.error('[IndexActionService] Error resolving root folder:', e);
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

  _resolveCurrentFolder(folderId, rootFolder, folders, userEmail) {
    let currentFolderId = folderId;
    if (currentFolderId === 'undefined') currentFolderId = null;
    const rootFolderId = rootFolder ? (rootFolder.folder_id || null) : null;
    if (!currentFolderId && rootFolderId) currentFolderId = rootFolderId;

    // Security: reject folder IDs that don't belong to this tenant
    if (currentFolderId && currentFolderId !== rootFolderId) {
      const tenantFolderIds = new Set(folders.map(f => f.folder_id || f.id));
      if (!tenantFolderIds.has(currentFolderId)) {
        console.warn(`[IndexActionService] Unauthorized folder access attempt: ${currentFolderId} by ${userEmail}`);
        currentFolderId = rootFolderId;
      }
    }

    return { currentFolderId, rootFolderId };
  }

  async _fetchViewData(viewMode, searchQuery, ctx) {
    let subFolders = [];
    let filesList = [];
    let pagination = null;

    try {
      if (viewMode === 'home') {
        // Home view is intentionally blank — content will be defined separately
      } else if (viewMode === 'search' && searchQuery) {
        ({ subFolders, filesList, pagination } = await this._fetchSearchViewData(searchQuery, ctx));
      } else if (viewMode === 'recent') {
        ({ subFolders, filesList } = await this._fetchRecentViewData(ctx));
      } else if (viewMode === 'starred') {
        subFolders = await this._fetchStarredViewData(ctx);
      } else if (viewMode === 'shared-with-me') {
        ({ subFolders, filesList } = await this._fetchSharedViewData(ctx));
      } else if (viewMode === 'trash') {
        ({ subFolders, filesList } = await this._fetchTrashViewData(ctx));
      } else {
        ({ subFolders, filesList, pagination } = await this._fetchDefaultViewData(ctx));
      }
    } catch (e) {
      console.error('[IndexActionService] Error fetching files/folders for view mode:', e);
    }

    return { subFolders, filesList, pagination };
  }

  async _fetchSearchViewData(searchQuery, ctx) {
    const { folderService, fileMetadataService, tenantId, identity, pageSize, page } = ctx;
    const parsed = SearchQueryParser.parse(searchQuery);
    const effectiveSearchTerm = parsed.searchTerm;
    const { filetype: fileExtension, intitle, allintitle, author } = parsed;

    const searchOptions = {};
    if (fileExtension) searchOptions.fileExtension = fileExtension;
    if (intitle) searchOptions.intitle = intitle;
    if (allintitle) searchOptions.allintitle = allintitle;
    if (author) searchOptions.author = author;

    // When filetype is specified, skip folder search (folders have no extensions)
    let allMatchingFolders = [];
    if (!fileExtension && (effectiveSearchTerm || intitle || allintitle || author)) {
      const folderOptions = {};
      if (intitle) folderOptions.intitle = intitle;
      if (allintitle) folderOptions.allintitle = allintitle;
      if (author) folderOptions.author = author;
      allMatchingFolders = await folderService.searchFolders(tenantId, identity.user_id, effectiveSearchTerm, 500, folderOptions);
    }

    const totalFiles = await fileMetadataService.searchFilesCount(tenantId, identity.user_id, effectiveSearchTerm, searchOptions);
    const totalFolders = allMatchingFolders.length;
    const totalItems = totalFolders + totalFiles;
    const totalPages = Math.ceil(totalItems / pageSize);
    const offset = (page - 1) * pageSize;

    const { subFolders, filesList } = await this._paginateFoldersAndFiles(
      allMatchingFolders, offset, pageSize, totalFolders,
      (limit, fileOffset) => fileMetadataService.searchFiles(tenantId, identity.user_id, effectiveSearchTerm, limit, fileOffset, searchOptions)
    );

    const pagination = totalItems > pageSize
      ? { page, pageSize, totalFiles: totalItems, totalPages, from: offset + 1, to: Math.min(offset + pageSize, totalItems) }
      : null;

    return { subFolders, filesList, pagination };
  }

  async _fetchRecentViewData(ctx) {
    const { fileMetadataService, folderService, userEmail, tenantId } = ctx;
    const filesList = await fileMetadataService.getRecentFiles(userEmail, 50, tenantId);
    const subFolders = await folderService.getRecentFolders(userEmail, 20);
    return { subFolders, filesList };
  }

  async _fetchStarredViewData(ctx) {
    const { qcs, folderStarService, tenantId, identity, userReg } = ctx;
    return qcs.cacheThrough(
      `stars:folders:${tenantId}:${identity.user_id}`,
      async () => {
        const list = await folderStarService.listStarred(tenantId, identity.user_id);
        return list.map(f => typeof f.toObject === 'function' ? f.toObject() : f);
      },
      { ttl: 120, registries: [userReg] }
    );
  }

  async _fetchSharedViewData(ctx) {
    const { fileMetadataService, folderService, userEmail, tenantId, currentFolderId } = ctx;
    const filesList = await fileMetadataService.getSharedFiles(userEmail, 50);
    let subFolders = [];
    try {
      if (tenantId) {
        subFolders = await folderService.getFoldersByParent(currentFolderId, tenantId);
      }
    } catch (e) {
      console.error('[IndexActionService] Error fetching subfolders:', e);
    }
    return { subFolders, filesList };
  }

  async _fetchTrashViewData(ctx) {
    const { fileMetadataService, folderService, userEmail } = ctx;
    const filesList = await fileMetadataService.getDeletedFiles(userEmail);
    const subFolders = await folderService.getTrashedFolders(userEmail);
    return { subFolders, filesList };
  }

  async _fetchDefaultViewData(ctx) {
    const { qcs, folderService, fileMetadataService, tenantId, emailHash, userEmail, currentFolderId, tenantReg, pageSize, page, sortMode } = ctx;

    let subFolders = [];
    if (tenantId) {
      subFolders = await qcs.cacheThrough(
        `folders:parent:${currentFolderId}:${sortMode}`,
        async () => {
          const list = await folderService.getFoldersByParent(currentFolderId, tenantId, sortMode);
          return list.map(f => typeof f.toObject === 'function' ? f.toObject() : f);
        },
        { ttl: 120, registries: [tenantReg] }
      );
    }

    const totalFiles = await qcs.cacheThrough(
      `files:count:${emailHash}:${currentFolderId}`,
      () => fileMetadataService.getFilesByFolderCount(userEmail, currentFolderId),
      { ttl: 60, registries: [tenantReg] }
    );
    const totalFolders = subFolders.length;
    const totalItems = totalFolders + totalFiles;
    const totalPages = Math.ceil(totalItems / pageSize);
    const offset = (page - 1) * pageSize;

    const fetched = await this._paginateFoldersAndFiles(
      subFolders, offset, pageSize, totalFolders,
      (limit, fileOffset) => qcs.cacheThrough(
        `files:list:${emailHash}:${currentFolderId}:${sortMode}:${limit}:${fileOffset}`,
        async () => {
          const list = await fileMetadataService.getFilesByFolder(userEmail, currentFolderId, limit, fileOffset, sortMode);
          return list.map(f => typeof f.toObject === 'function' ? f.toObject() : f);
        },
        { ttl: 60, registries: [tenantReg] }
      )
    );

    const pagination = totalItems > pageSize
      ? { page, pageSize, totalFiles: totalItems, totalPages, from: offset + 1, to: Math.min(offset + pageSize, totalItems) }
      : null;

    return { subFolders: fetched.subFolders, filesList: fetched.filesList, pagination };
  }

  async _paginateFoldersAndFiles(allFolders, offset, pageSize, totalFolders, fetchFilesFn) {
    if (offset < totalFolders) {
      const subFolders = allFolders.slice(offset, offset + pageSize);
      const remainingSlots = pageSize - subFolders.length;
      const filesList = remainingSlots > 0 ? await fetchFilesFn(remainingSlots, 0) : [];
      return { subFolders, filesList };
    }
    const fileOffset = offset - totalFolders;
    const filesList = await fetchFilesFn(pageSize, fileOffset);
    return { subFolders: [], filesList };
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
      console.error('[IndexActionService] Error fetching starred files:', e);
      return [];
    }
  }

  async _fetchStarredFileDetails(fileMetadataService, starredFileIds) {
    try {
      if (starredFileIds.length === 0) return [];
      const rawFiles = await fileMetadataService.getFilesByIds(starredFileIds);
      return rawFiles.map(file => {
        const data = typeof file.toObject === 'function' ? file.toObject() : file;
        return {
          id: data.file_id || data.id,
          name: data.title || data.name,
          owner: 'me',
          last_modified: data.updated_dt || data.last_modified,
          size_bytes: data.size_bytes,
          item_type: 'file',
          document_type: data.document_type,
          folder_id: data.folder_id
        };
      });
    } catch (e) {
      console.error('[IndexActionService] Error fetching starred file details:', e);
      return [];
    }
  }

  async _fetchStarredFolderIds(viewMode, subFolders, qcs, folderStarService, tenantId, identity, userReg) {
    try {
      if (viewMode === 'starred') {
        return subFolders.map(f => f.folder_id);
      }
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
      console.error('[IndexActionService] Error fetching starred folder IDs:', e);
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

  async _populateSharedFlags(mergedItems, sm, tenantId) {
    try {
      const fileIds = mergedItems.filter(i => i.item_type === 'file' && i.id).map(i => i.id);
      const folderIds = mergedItems.filter(i => i.item_type === 'folder' && (i.folder_id || i.id)).map(i => i.folder_id || i.id);

      const [sharedFileIds, sharedFolderIds, userSharedFileIds] = await Promise.all([
        fileIds.length ? sm.get('ShareLinkTable').fetchSharedFileIds(fileIds) : new Set(),
        folderIds.length && tenantId ? sm.get('FolderShareLinkTable').fetchSharedFolderIds(tenantId, folderIds) : new Set(),
        fileIds.length && tenantId ? sm.get('FilePermissionTable').fetchUserSharedFileIds(fileIds, tenantId) : new Set()
      ]);

      mergedItems.forEach(item => {
        if (item.item_type === 'file') {
          item.is_shared = sharedFileIds.has(item.id) || userSharedFileIds.has(item.id);
        } else {
          item.is_shared = sharedFolderIds.has(item.folder_id || item.id);
        }
      });
    } catch (e) {
      console.error('[IndexActionService] Error populating is_shared:', e);
    }
  }

  async _populateDerivativeFlags(mergedItems, sm) {
    try {
      const fileIds = mergedItems.filter(i => i.item_type === 'file' && i.id).map(i => i.id);
      if (fileIds.length === 0) return;

      const derivativeTable = sm.get('FileDerivativeTable');
      const [thumbnailFileIds, previewPagesFileIds] = await Promise.all([
        derivativeTable.fetchFileIdsWithThumbnails(fileIds),
        derivativeTable.fetchFileIdsWithPreviewPages(fileIds)
      ]);
      mergedItems.forEach(item => {
        if (item.item_type === 'file') {
          item.has_thumbnail = thumbnailFileIds.has(item.id);
          item.has_preview_pages = previewPagesFileIds.has(item.id);
        }
      });
    } catch (e) {
      console.error('[IndexActionService] Error populating has_thumbnail:', e);
    }
  }

  _sortMergedItems(mergedItems, sortMode) {
    mergedItems.sort((a, b) => {
      switch (sortMode) {
        case 'name':
          return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
        case 'owner':
          return (a.owner || a.created_by || '').toLowerCase().localeCompare((b.owner || b.created_by || '').toLowerCase());
        case 'last_modified': {
          const dateA = new Date(a.last_modified || a.updated_dt || a.created_dt || 0);
          const dateB = new Date(b.last_modified || b.updated_dt || b.created_dt || 0);
          return dateB - dateA;
        }
        case 'size': {
          const sizeA = (a.size_bytes != null && a.item_type !== 'folder') ? (Number.parseInt(a.size_bytes) || 0) : -1;
          const sizeB = (b.size_bytes != null && b.item_type !== 'folder') ? (Number.parseInt(b.size_bytes) || 0) : -1;
          return sizeB - sizeA;
        }
        default:
          return 0;
      }
    });
  }

  async _fetchHomeSuggestions(userId, tenantId) {
    if (!userId || !tenantId) return { folders: [], files: [] };

    const CACHE_TTL_MINUTES = 60;

    try {
      const sm = this.getServiceManager();
      const adapter = sm.get('DbAdapter');

      // Check cache freshness
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

      // Read from cache
      const [foldersResult, filesResult] = await Promise.all([
        adapter.query(
          `SELECT usc.asset_id AS folder_id, usc.score, usc.reason,
                  f.name, f.parent_folder_id, f.updated_dt
           FROM user_suggestion_cache usc
           JOIN folder f ON f.folder_id = usc.asset_id
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
                  fm.folder_id, fm.updated_dt, fm.created_dt, fm.visibility
           FROM user_suggestion_cache usc
           JOIN file_metadata fm ON fm.file_id = usc.asset_id
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
        score: Number(r.score),
        visibility: r.visibility,
        item_type: 'file'
      }));

      await this._populateSharedFlags([...folders, ...files], sm, tenantId);

      return { folders, files };
    } catch (e) {
      console.error('[IndexActionService] Error fetching home suggestions:', e);
      return { folders: [], files: [] };
    }
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

    // Atomically replace cache for this user
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

  _buildBreadcrumbs(currentFolderId, rootFolderId, folders) {
    if (!currentFolderId || !rootFolderId) return [{ name: 'My Drive', folder_id: rootFolderId }];

    const folderMap = {};
    for (const f of folders) {
      folderMap[f.folder_id] = f;
    }

    const crumbs = [];
    let cur = currentFolderId;
    while (cur && folderMap[cur]) {
      const folder = folderMap[cur];
      crumbs.unshift({ name: folder.name, folder_id: folder.folder_id });
      cur = folder.parent_folder_id;
    }

    // Replace root folder name with "My Drive"
    if (crumbs.length > 0 && crumbs[0].folder_id === rootFolderId) {
      crumbs[0].name = 'My Drive';
    }

    return crumbs;
  }
}

module.exports = IndexActionService;
