/* eslint-disable no-undef */
const AbstractActionService = require(global.applicationPath('/application/service/abstract-action-service'));
const InputFilter = require(global.applicationPath('/library/input-filter/input-filter'));
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
  async list({ userEmail, identity, folderId, rawQuery }) {
    const sm = this.getServiceManager();
    const folderService = sm.get('FolderService');
    const fileMetadataService = sm.get('FileMetadataService');
    const folderStarService = sm.get('FolderStarService');
    const cache = this.getCache();

    // --- View mode + layout mode from query params ---
    const inputFilter = InputFilter.factory({
      view: {
        required: false,
        validators: [{
          name: 'InArray',
          options: { haystack: ['my-drive', 'starred', 'recent', 'shared', 'shared-with-me', 'trash'] }
        }]
      },
      layout: {
        required: false,
        validators: [{
          name: 'InArray',
          options: { haystack: ['grid', 'list'] }
        }]
      }
    });
    inputFilter.setData(rawQuery);

    let viewMode = 'my-drive';
    let layoutMode = 'grid';
    const layoutCacheKey = `preferences_layout_${crypto.createHash('md5').update(userEmail).digest('hex')}`;

    if (inputFilter.isValid()) {
      const values = inputFilter.getValues();
      if (values.view) viewMode = values.view;
      if (values.layout) {
        layoutMode = values.layout;
        cache.save(layoutMode, layoutCacheKey);
      } else {
        const cached = cache.load(layoutCacheKey);
        if (cached) layoutMode = cached;
      }
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
        tenantId = resolved.tenantId;
      } catch (e) {
        console.error('[IndexActionService] Error resolving tenantId:', e);
      }
    }

    // --- Files + subfolders by view mode ---
    let subFolders = [];
    let filesList = [];
    try {
      if (viewMode === 'recent') {
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
        filesList = await fileMetadataService.getFilesByFolder(userEmail, currentFolderId);
      }
    } catch (e) {
      console.error('[IndexActionService] Error fetching files/folders for view mode:', e);
    }

    // Subfolders for standard folder views (overwrites above for non-special modes)
    try {
      if (tenantId && viewMode !== 'recent' && viewMode !== 'starred' && viewMode !== 'trash') {
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

    return {
      viewMode,
      layoutMode,
      folders: folders.map(toPlain),
      filesList: filesList.map(toPlain),
      subFolders: viewMode === 'shared-with-me' ? [] : subFolders.map(toPlain),
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
