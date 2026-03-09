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
    const viewCtx = { sm, qcs, folderService, fileMetadataService, folderStarService, tenantId, emailHash, userEmail, identity, userReg, tenantReg, currentFolderId, pageSize, page };
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

    if (viewMode === 'search') {
      this._buildSearchLocationAnnotations(plainFiles, plainSubFolders, folders, toPlain);
    }

    // Merged array for unified layout helpers (folders first, then files)
    const mergedItems = [
      ...plainSubFolders.map(f => ({ ...f, item_type: 'folder' })),
      ...plainFiles.map(f => ({ ...f, item_type: f.item_type || 'file' }))
    ];

    await this._populateSharedFlags(mergedItems, sm, tenantId);
    await this._populateDerivativeFlags(mergedItems, sm);
    this._sortMergedItems(mergedItems, sortMode);

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
      expandedFolderIds
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
      if (viewMode === 'search' && searchQuery) {
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
    const { qcs, folderService, fileMetadataService, tenantId, emailHash, userEmail, currentFolderId, tenantReg, pageSize, page } = ctx;

    let subFolders = [];
    if (tenantId) {
      subFolders = await qcs.cacheThrough(
        `folders:parent:${currentFolderId}`,
        async () => {
          const list = await folderService.getFoldersByParent(currentFolderId, tenantId);
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
        `files:list:${emailHash}:${currentFolderId}:${limit}:${fileOffset}`,
        async () => {
          const list = await fileMetadataService.getFilesByFolder(userEmail, currentFolderId, limit, fileOffset);
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
          document_type: data.document_type
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

  _buildSearchLocationAnnotations(plainFiles, plainSubFolders, folders, toPlain) {
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
        fileIds.length ? sm.get('FilePermissionTable').fetchUserSharedFileIds(fileIds) : new Set()
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
}

module.exports = IndexActionService;
