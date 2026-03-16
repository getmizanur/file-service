// application/service/action/search-action-service.js
/* eslint-disable no-undef */
const AbstractActionService = require(globalThis.applicationPath('/application/service/abstract-action-service'));
const SearchQueryParser = require(globalThis.applicationPath('/application/util/search-query-parser'));
const crypto = require('node:crypto');

class SearchActionService extends AbstractActionService {

  async list({ userEmail, identity, searchQuery, layoutQuery = null, sortQuery = null, page = 1 }) {
    const sm = this.getServiceManager();
    const folderService = sm.get('FolderService');
    const fileMetadataService = sm.get('FileMetadataService');
    const folderStarService = sm.get('FolderStarService');
    const cache = this.getCache();
    const qcs = sm.get('QueryCacheService');
    const emailHash = qcs.emailHash(userEmail);

    let profiler = null;
    try { profiler = sm.get('Profiler'); } catch { /* not available */ }
    const _t = (label, fn) => profiler?.isEnabled() ? profiler.time(label, fn, { parent: 'SearchActionService' }) : fn();

    const layoutMode = await _t('resolveLayoutMode', () => this._resolveLayoutMode(cache, userEmail, layoutQuery));
    const sortMode = await _t('resolveSortMode', () => this._resolveSortMode(cache, userEmail, sortQuery));
    const { rootFolder, tenantId } = await _t('resolveRootFolder', () => this._resolveRootFolder(qcs, folderService, userEmail, emailHash));

    const userReg = `registry:user:${emailHash}`;
    const tenantReg = tenantId ? `registry:tenant:${tenantId}` : null;
    const folderRegistries = tenantReg ? [userReg, tenantReg] : [userReg];

    const folders = await _t('fetchAllFolders', () => this._fetchAllFolders(qcs, folderService, tenantId, emailHash, folderRegistries));

    const rootFolderId = rootFolder ? (rootFolder.folder_id || null) : null;

    // Fetch search results with pagination
    const pageSize = 25;
    const parsed = SearchQueryParser.parse(searchQuery);
    const effectiveSearchTerm = parsed.searchTerm;
    const { searchOptions, allMatchingFolders } = await this._buildSearchContext(parsed, effectiveSearchTerm, folderService, tenantId, identity);

    const totalFiles = await fileMetadataService.searchFilesCount(tenantId, identity.user_id, effectiveSearchTerm, searchOptions);
    const totalFolders = allMatchingFolders.length;
    const totalItems = totalFolders + totalFiles;
    const totalPages = Math.ceil(totalItems / pageSize);
    const offset = (page - 1) * pageSize;

    const fetched = await this._paginateFoldersAndFiles(
      allMatchingFolders, offset, pageSize, totalFolders,
      (limit, fileOffset) => fileMetadataService.searchFiles(tenantId, identity.user_id, effectiveSearchTerm, limit, fileOffset, searchOptions)
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
      console.error('[SearchActionService] Error building folder tree:', e);
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
      viewMode: 'search',
      layoutMode,
      sortMode,
      searchQuery: searchQuery || null,
      pagination,
      folders: folders.map(toPlain),
      filesList: plainFiles,
      subFolders: plainSubFolders,
      mergedItems,
      starredFileIds,
      starredFolderIds,
      folderTree,
      currentFolderId: rootFolderId,
      rootFolderId,
      expandedFolderIds
    };
  }

  // ─── Private helpers ────────────────────────────────────────

  async _buildSearchContext(parsed, effectiveSearchTerm, folderService, tenantId, identity) {
    const { filetype: fileExtension, intitle, allintitle, author } = parsed;
    const searchOptions = {};
    if (fileExtension) searchOptions.fileExtension = fileExtension;
    if (intitle) searchOptions.intitle = intitle;
    if (allintitle) searchOptions.allintitle = allintitle;
    if (author) searchOptions.author = author;

    let allMatchingFolders = [];
    if (!fileExtension && (effectiveSearchTerm || intitle || allintitle || author)) {
      const folderOptions = {};
      if (intitle) folderOptions.intitle = intitle;
      if (allintitle) folderOptions.allintitle = allintitle;
      if (author) folderOptions.author = author;
      allMatchingFolders = await folderService.searchFolders(tenantId, identity.user_id, effectiveSearchTerm, 500, folderOptions);
    }
    return { searchOptions, allMatchingFolders };
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
      console.error('[SearchActionService] Error resolving root folder:', e);
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
      console.error('[SearchActionService] Error fetching starred files:', e);
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
      console.error('[SearchActionService] Error fetching starred folder IDs:', e);
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

module.exports = SearchActionService;
