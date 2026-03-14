// application/service/action/my-drive-action-service.js
/* eslint-disable no-undef */
const AbstractActionService = require(globalThis.applicationPath('/application/service/abstract-action-service'));
const crypto = require('node:crypto');

class MyDriveActionService extends AbstractActionService {

  async list({ userEmail, identity, folderId, layoutQuery = null, sortQuery = null, page = 1 }) {
    const sm = this.getServiceManager();
    const folderService = sm.get('FolderService');
    const fileMetadataService = sm.get('FileMetadataService');
    const folderStarService = sm.get('FolderStarService');
    const cache = this.getCache();
    const qcs = sm.get('QueryCacheService');
    const emailHash = qcs.emailHash(userEmail);

    let profiler = null;
    try { profiler = sm.get('Profiler'); } catch { /* not available */ }
    const _t = (label, fn) => profiler?.isEnabled() ? profiler.time(label, fn, { parent: 'MyDriveActionService' }) : fn();

    const layoutMode = await _t('resolveLayoutMode', () => this._resolveLayoutMode(cache, userEmail, layoutQuery));
    const sortMode = await _t('resolveSortMode', () => this._resolveSortMode(cache, userEmail, sortQuery));
    const { rootFolder, tenantId } = await _t('resolveRootFolder', () => this._resolveRootFolder(qcs, folderService, userEmail, emailHash));

    const userReg = `registry:user:${emailHash}`;
    const tenantReg = tenantId ? `registry:tenant:${tenantId}` : null;
    const folderRegistries = tenantReg ? [userReg, tenantReg] : [userReg];

    const folders = await _t('fetchAllFolders', () => this._fetchAllFolders(qcs, folderService, tenantId, emailHash, folderRegistries));

    const { currentFolderId, rootFolderId } = this._resolveCurrentFolder(folderId, rootFolder, folders, userEmail);

    // Fetch view data with pagination
    const pageSize = 25;
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

    // Build result
    const starredFileIds = await _t('fetchStarredFileIds', () => this._fetchStarredFileIds(qcs, sm, userEmail, emailHash, userReg));

    let folderTree = [];
    try {
      folderTree = folderService.buildFolderTree(folders);
    } catch (e) {
      console.error('[MyDriveActionService] Error building folder tree:', e);
    }

    const starredFolderIds = await _t('fetchStarredFolderIds', () =>
      this._fetchStarredFolderIds(qcs, folderStarService, tenantId, identity, userReg));

    const expandCacheKey = `folder_expanded_state_${crypto.createHash('md5').update(userEmail).digest('hex')}`;
    const expandedFolderIds = await cache.load(expandCacheKey) || [];

    const toPlain = (item) => (typeof item.toObject === 'function' ? item.toObject() : item);
    const plainFiles = fetched.filesList.map(toPlain);
    const plainSubFolders = fetched.subFolders.map(toPlain);

    this._buildLocationAnnotations(plainFiles, plainSubFolders, folders, toPlain);

    const mergedItems = [
      ...plainSubFolders.map(f => ({ ...f, item_type: 'folder' })),
      ...plainFiles.map(f => ({ ...f, item_type: f.item_type || 'file' }))
    ];

    await Promise.all([
      _t('populateSharedFlags', () => this._populateSharedFlags(mergedItems, sm, tenantId, qcs)),
      _t('populateDerivativeFlags', () => this._populateDerivativeFlags(mergedItems, sm, qcs, tenantId))
    ]);
    this._sortMergedItems(mergedItems, sortMode);

    return {
      viewMode: 'my-drive',
      layoutMode,
      sortMode,
      pagination,
      folders: folders.map(toPlain),
      mergedItems,
      starredFileIds,
      starredFolderIds,
      folderTree,
      currentFolderId,
      rootFolderId,
      expandedFolderIds
    };
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
      console.error('[MyDriveActionService] Error resolving root folder:', e);
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

    if (currentFolderId && currentFolderId !== rootFolderId) {
      const tenantFolderIds = new Set(folders.map(f => f.folder_id || f.id));
      if (!tenantFolderIds.has(currentFolderId)) {
        console.warn(`[MyDriveActionService] Unauthorized folder access attempt: ${currentFolderId} by ${userEmail}`);
        currentFolderId = rootFolderId;
      }
    }

    return { currentFolderId, rootFolderId };
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
      console.error('[MyDriveActionService] Error fetching starred files:', e);
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
      console.error('[MyDriveActionService] Error fetching starred folder IDs:', e);
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

  async _populateSharedFlags(mergedItems, sm, tenantId, qcs) {
    try {
      const fileIds = mergedItems.filter(i => i.item_type === 'file' && i.id).map(i => i.id);
      const folderIds = mergedItems.filter(i => i.item_type === 'folder' && (i.folder_id || i.id)).map(i => i.folder_id || i.id);

      const tenantReg = tenantId ? `registry:tenant:${tenantId}` : null;
      const registries = tenantReg ? [tenantReg] : [];
      const ttl = 30;

      const idHash = (ids) => {
        if (ids.length === 0) return '';
        return crypto.createHash('md5').update(ids.slice().sort().join(',')).digest('hex');
      };

      const cachedSet = async (key, queryFn) => {
        if (!qcs) return queryFn();
        const arr = await qcs.cacheThrough(key, async () => [...(await queryFn())], { ttl, registries });
        return new Set(arr);
      };

      const [sharedFileIds, sharedFolderIds, userSharedFileIds] = await Promise.all([
        fileIds.length && tenantId
          ? cachedSet(`shared:files:${tenantId}:${idHash(fileIds)}`, () => this.getTable('ShareLinkTable').fetchSharedFileIds(tenantId, fileIds))
          : new Set(),
        folderIds.length && tenantId
          ? cachedSet(`shared:folders:${tenantId}:${idHash(folderIds)}`, () => this.getTable('FolderShareLinkTable').fetchSharedFolderIds(tenantId, folderIds))
          : new Set(),
        fileIds.length && tenantId
          ? cachedSet(`shared:perms:${tenantId}:${idHash(fileIds)}`, () => this.getTable('FilePermissionTable').fetchUserSharedFileIds(fileIds, tenantId))
          : new Set()
      ]);

      mergedItems.forEach(item => {
        if (item.item_type === 'file') {
          item.is_shared = sharedFileIds.has(item.id) || userSharedFileIds.has(item.id);
        } else {
          item.is_shared = sharedFolderIds.has(item.folder_id || item.id);
        }
      });
    } catch (e) {
      console.error('[MyDriveActionService] Error populating is_shared:', e);
    }
  }

  async _populateDerivativeFlags(mergedItems, sm, qcs = null, tenantId = null) {
    try {
      const fileIds = mergedItems.filter(i => i.item_type === 'file' && i.id).map(i => i.id);
      if (fileIds.length === 0) return;

      const derivativeTable = this.getTable('FileDerivativeTable');

      const idHash = crypto.createHash('md5').update(fileIds.slice().sort().join(',')).digest('hex');
      const ttl = 60;
      const tenantReg = tenantId ? `registry:tenant:${tenantId}` : null;
      const registries = tenantReg ? [tenantReg] : [];

      const cachedSet = async (key, queryFn) => {
        if (!qcs) return queryFn();
        const arr = await qcs.cacheThrough(key, async () => [...(await queryFn())], { ttl, registries });
        return new Set(arr);
      };

      const [thumbnailFileIds, previewPagesFileIds] = await Promise.all([
        cachedSet(`deriv:thumbs:${idHash}`, () => derivativeTable.fetchFileIdsWithThumbnails(fileIds)),
        cachedSet(`deriv:pages:${idHash}`, () => derivativeTable.fetchFileIdsWithPreviewPages(fileIds))
      ]);
      mergedItems.forEach(item => {
        if (item.item_type === 'file') {
          item.has_thumbnail = thumbnailFileIds.has(item.id);
          item.has_preview_pages = previewPagesFileIds.has(item.id);
        }
      });
    } catch (e) {
      console.error('[MyDriveActionService] Error populating has_thumbnail:', e);
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

module.exports = MyDriveActionService;
