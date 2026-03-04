// application/service/action/index-action-service.js
/* eslint-disable no-undef */
const AbstractActionService = require(global.applicationPath('/application/service/abstract-action-service'));
const crypto = require('crypto');

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

    // --- Layout mode: persist/restore user preference ---
    const layoutCacheKey = `preferences_layout_${crypto.createHash('md5').update(userEmail).digest('hex')}`;
    let layoutMode = 'grid';
    if (layoutQuery) {
      layoutMode = layoutQuery;
      await cache.save(layoutMode, layoutCacheKey);
    } else {
      const cached = await cache.load(layoutCacheKey);
      if (cached) layoutMode = cached;
    }

    // --- Sort mode: persist/restore user preference ---
    const sortCacheKey = `preferences_sort_${crypto.createHash('md5').update(userEmail).digest('hex')}`;
    let sortMode = 'name';
    if (sortQuery) {
      sortMode = sortQuery;
      await cache.save(sortMode, sortCacheKey);
    } else {
      const cachedSort = await cache.load(sortCacheKey);
      if (cachedSort) sortMode = cachedSort;
    }

    // --- Root folder + tenant (cached, stable) ---
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

    // --- All folders (sidebar nav, cached) ---
    const userReg = `registry:user:${emailHash}`;
    const tenantReg = tenantId ? `registry:tenant:${tenantId}` : null;
    const folderRegistries = tenantReg ? [userReg, tenantReg] : [userReg];

    const folders = await qcs.cacheThrough(
      `folders:all:${emailHash}`,
      () => folderService.getFoldersByUserEmail(userEmail),
      { ttl: 120, registries: folderRegistries }
    );

    // --- Current folder ---
    let currentFolderId = folderId;
    if (currentFolderId === 'undefined') currentFolderId = null;
    const rootFolderId = rootFolder ? (rootFolder.folder_id || null) : null;
    if (!currentFolderId && rootFolderId) currentFolderId = rootFolderId;

    // --- Pagination (search view only) ---
    const pageSize = 25;
    let pagination = null;

    // --- Files + subfolders by view mode ---
    let subFolders = [];
    let filesList = [];
    try {
      if (viewMode === 'search' && searchQuery) {
        // Fetch ALL matching folders (typically few) and count total matching files
        const allMatchingFolders = await folderService.searchFolders(tenantId, identity.user_id, searchQuery, 500);
        const totalFiles = await fileMetadataService.searchFilesCount(tenantId, identity.user_id, searchQuery);

        const totalFolders = allMatchingFolders.length;
        const totalItems = totalFolders + totalFiles;
        const totalPages = Math.ceil(totalItems / pageSize);
        const offset = (page - 1) * pageSize;

        // Determine which folders/files appear on current page (folders first, then files)
        if (offset < totalFolders) {
          subFolders = allMatchingFolders.slice(offset, offset + pageSize);
          const remainingSlots = pageSize - subFolders.length;
          if (remainingSlots > 0) {
            filesList = await fileMetadataService.searchFiles(tenantId, identity.user_id, searchQuery, remainingSlots, 0);
          }
        } else {
          subFolders = [];
          const fileOffset = offset - totalFolders;
          filesList = await fileMetadataService.searchFiles(tenantId, identity.user_id, searchQuery, pageSize, fileOffset);
        }

        if (totalItems > pageSize) {
          pagination = {
            page,
            pageSize,
            totalFiles: totalItems,
            totalPages,
            from: offset + 1,
            to: Math.min(offset + pageSize, totalItems)
          };
        }
      } else if (viewMode === 'recent') {
        filesList = await fileMetadataService.getRecentFiles(userEmail, 50, tenantId);
        subFolders = await folderService.getRecentFolders(userEmail, 20);
      } else if (viewMode === 'starred') {
        subFolders = await qcs.cacheThrough(
          `stars:folders:${tenantId}:${identity.user_id}`,
          async () => {
            const list = await folderStarService.listStarred(tenantId, identity.user_id);
            return list.map(f => typeof f.toObject === 'function' ? f.toObject() : f);
          },
          { ttl: 120, registries: [userReg] }
        );
      } else if (viewMode === 'shared-with-me') {
        filesList = await fileMetadataService.getSharedFiles(userEmail, 50);
      } else if (viewMode === 'trash') {
        filesList = await fileMetadataService.getDeletedFiles(userEmail);
        subFolders = await folderService.getTrashedFolders(userEmail);
      } else {
        // Default folder view — combined pagination (folders first, then files)
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

        if (offset < totalFolders) {
          subFolders = subFolders.slice(offset, offset + pageSize);
          const remainingSlots = pageSize - subFolders.length;
          if (remainingSlots > 0) {
            filesList = await qcs.cacheThrough(
              `files:list:${emailHash}:${currentFolderId}:${remainingSlots}:0`,
              async () => {
                const list = await fileMetadataService.getFilesByFolder(userEmail, currentFolderId, remainingSlots, 0);
                return list.map(f => typeof f.toObject === 'function' ? f.toObject() : f);
              },
              { ttl: 60, registries: [tenantReg] }
            );
          }
        } else {
          subFolders = [];
          const fileOffset = offset - totalFolders;
          filesList = await qcs.cacheThrough(
            `files:list:${emailHash}:${currentFolderId}:${pageSize}:${fileOffset}`,
            async () => {
              const list = await fileMetadataService.getFilesByFolder(userEmail, currentFolderId, pageSize, fileOffset);
              return list.map(f => typeof f.toObject === 'function' ? f.toObject() : f);
            },
            { ttl: 60, registries: [tenantReg] }
          );
        }

        if (totalItems > pageSize) {
          pagination = {
            page,
            pageSize,
            totalFiles: totalItems,
            totalPages,
            from: offset + 1,
            to: Math.min(offset + pageSize, totalItems)
          };
        }
      }
    } catch (e) {
      console.error('[IndexActionService] Error fetching files/folders for view mode:', e);
    }

    // Subfolders for non-paginated views only (search + default handle their own above)
    try {
      if (tenantId && viewMode === 'shared-with-me') {
        subFolders = await folderService.getFoldersByParent(currentFolderId, tenantId);
      }
    } catch (e) {
      console.error('[IndexActionService] Error fetching subfolders:', e);
    }

    // --- Starred file IDs (cached) ---
    let starredFileIds = [];
    try {
      starredFileIds = await qcs.cacheThrough(
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
    }

    // Starred view: fetch full file objects
    if (viewMode === 'starred') {
      try {
        if (starredFileIds.length > 0) {
          const rawFiles = await fileMetadataService.getFilesByIds(starredFileIds);
          filesList = rawFiles.map(file => {
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
        } else {
          filesList = [];
        }
      } catch (e) {
        console.error('[IndexActionService] Error fetching starred file details:', e);
        filesList = [];
      }
    }

    // --- Folder tree (sidebar) — reuse already-fetched folders ---
    let folderTree = [];
    try {
      folderTree = folderService.buildFolderTree(folders);
    } catch (e) {
      console.error('[IndexActionService] Error building folder tree:', e);
    }

    // --- Starred folder IDs for UI highlight (cached) ---
    let starredFolderIds = [];
    try {
      if (viewMode === 'starred') {
        starredFolderIds = subFolders.map(f => f.folder_id);
      } else {
        const starredFolderList = await qcs.cacheThrough(
          `stars:folders:${tenantId}:${identity.user_id}`,
          async () => {
            const list = await folderStarService.listStarred(tenantId, identity.user_id);
            return list.map(f => typeof f.toObject === 'function' ? f.toObject() : f);
          },
          { ttl: 120, registries: [userReg] }
        );
        starredFolderIds = starredFolderList.map(f => f.folder_id);
      }
    } catch (e) {
      console.error('[IndexActionService] Error fetching starred folder IDs:', e);
    }

    // --- Expanded folder state ---
    const expandCacheKey = `folder_expanded_state_${crypto.createHash('md5').update(userEmail).digest('hex')}`;
    const expandedFolderIds = await cache.load(expandCacheKey) || [];

    // Normalize entities to plain objects
    const toPlain = (item) => (typeof item.toObject === 'function' ? item.toObject() : item);

    let plainFiles = filesList.map(toPlain);
    let plainSubFolders = viewMode === 'shared-with-me' ? [] : subFolders.map(toPlain);

    // Annotate search results with location (parent folder name + full breadcrumb path)
    if (viewMode === 'search') {
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

    // Merged array for unified layout helpers (folders first, then files)
    const mergedItems = [
      ...plainSubFolders.map(f => ({ ...f, item_type: 'folder' })),
      ...plainFiles.map(f => ({ ...f, item_type: f.item_type || 'file' }))
    ];

    // --- Populate is_shared flag ---
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

    // --- Sort merged items ---
    mergedItems.sort((a, b) => {
      switch (sortMode) {
        case 'name': {
          return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
        }
        case 'owner': {
          return (a.owner || a.created_by || '').toLowerCase().localeCompare((b.owner || b.created_by || '').toLowerCase());
        }
        case 'last_modified': {
          const dateA = new Date(a.last_modified || a.updated_dt || a.created_dt || 0);
          const dateB = new Date(b.last_modified || b.updated_dt || b.created_dt || 0);
          return dateB - dateA;
        }
        case 'size': {
          const sizeA = (a.size_bytes != null && a.item_type !== 'folder') ? (parseInt(a.size_bytes) || 0) : -1;
          const sizeB = (b.size_bytes != null && b.item_type !== 'folder') ? (parseInt(b.size_bytes) || 0) : -1;
          return sizeB - sizeA;
        }
        default:
          return 0;
      }
    });

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
}

module.exports = IndexActionService;
