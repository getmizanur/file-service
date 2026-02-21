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
  async list({ userEmail, identity, folderId, viewMode = 'my-drive', layoutQuery = null, searchQuery = null, page = 1 }) {
    const sm = this.getServiceManager();
    const folderService = sm.get('FolderService');
    const fileMetadataService = sm.get('FileMetadataService');
    const folderStarService = sm.get('FolderStarService');
    const cache = this.getCache();

    // --- Layout mode: persist/restore user preference ---
    const layoutCacheKey = `preferences_layout_${crypto.createHash('md5').update(userEmail).digest('hex')}`;
    let layoutMode = 'grid';
    if (layoutQuery) {
      layoutMode = layoutQuery;
      cache.save(layoutMode, layoutCacheKey);
    } else {
      const cached = cache.load(layoutCacheKey);
      if (cached) layoutMode = cached;
    }

    // --- All folders (sidebar nav) ---
    const folders = await folderService.getFoldersByUserEmail(userEmail);

    // --- Current folder ---
    let currentFolderId = folderId;
    if (currentFolderId === 'undefined') currentFolderId = null;

    // --- Root folder ---
    let rootFolder = null;
    try {
      rootFolder = await folderService.getRootFolderByUserEmail(userEmail);
    } catch (e) {
      console.error('[IndexActionService] Error resolving root folder:', e);
    }
    const rootFolderId = rootFolder ? rootFolder.getFolderId() : null;
    if (!currentFolderId && rootFolderId) currentFolderId = rootFolderId;

    // --- Tenant ID ---
    let tenantId = null;
    if (rootFolder) {
      tenantId = rootFolder.getTenantId();
    } else {
      try {
        const resolved = await sm.get('AppUserTable').resolveByEmail(userEmail);
        tenantId = resolved.tenant_id;
      } catch (e) {
        console.error('[IndexActionService] Error resolving tenantId:', e);
      }
    }

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
        subFolders = await folderStarService.listStarred(tenantId, identity.user_id);
      } else if (viewMode === 'shared-with-me') {
        filesList = await fileMetadataService.getSharedFiles(userEmail, 50);
      } else if (viewMode === 'trash') {
        filesList = await fileMetadataService.getDeletedFiles(userEmail);
        subFolders = await folderService.getTrashedFolders(userEmail);
      } else {
        // Default folder view — combined pagination (folders first, then files)
        if (tenantId) {
          subFolders = await folderService.getFoldersByParent(currentFolderId, tenantId);
        }
        const totalFiles = await fileMetadataService.getFilesByFolderCount(userEmail, currentFolderId);
        const totalFolders = subFolders.length;
        const totalItems = totalFolders + totalFiles;
        const totalPages = Math.ceil(totalItems / pageSize);
        const offset = (page - 1) * pageSize;

        if (offset < totalFolders) {
          subFolders = subFolders.slice(offset, offset + pageSize);
          const remainingSlots = pageSize - subFolders.length;
          if (remainingSlots > 0) {
            filesList = await fileMetadataService.getFilesByFolder(userEmail, currentFolderId, remainingSlots, 0);
          }
        } else {
          subFolders = [];
          const fileOffset = offset - totalFolders;
          filesList = await fileMetadataService.getFilesByFolder(userEmail, currentFolderId, pageSize, fileOffset);
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

    // --- Starred file IDs ---
    let starredFileIds = [];
    try {
      const fileStarService = sm.get('FileStarService');
      const starredFiles = await fileStarService.getStarredFiles(userEmail);
      starredFileIds = starredFiles.map(sf => sf.getFileId());
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

    // --- Folder tree (sidebar) ---
    let folderTree = [];
    try {
      folderTree = await folderService.getFolderTreeByUserEmail(userEmail);
    } catch (e) {
      console.error('[IndexActionService] Error fetching folder tree:', e);
    }

    // --- Starred folder IDs for UI highlight ---
    let starredFolderIds = [];
    try {
      if (viewMode === 'starred') {
        starredFolderIds = subFolders.map(f => f.folder_id);
      } else {
        const starredFolderList = await folderStarService.listStarred(tenantId, identity.user_id);
        starredFolderIds = starredFolderList.map(f => f.folder_id);
      }
    } catch (e) {
      console.error('[IndexActionService] Error fetching starred folder IDs:', e);
    }

    // --- Expanded folder state ---
    const expandCacheKey = `folder_expanded_state_${crypto.createHash('md5').update(userEmail).digest('hex')}`;
    const expandedFolderIds = cache.load(expandCacheKey) || [];

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

    return {
      viewMode,
      layoutMode,
      searchQuery,
      pagination,
      folders: folders.map(toPlain),
      filesList: plainFiles,
      subFolders: plainSubFolders,
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
