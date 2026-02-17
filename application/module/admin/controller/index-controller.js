const Controller = require(
  global.applicationPath('/library/mvc/controller/base-controller'));
const InputFilter = require(
  global.applicationPath('/library/input-filter/input-filter'));
const crypto = require('crypto');



class IndexController extends Controller {

  /**
   * Constructor
   *
   * Initializes the IndexController with optional configuration.
   *
   * @param {Object} options - Controller configuration options
   */
  constructor(options = {}) {
    super(options);
  }

  preDispatch() {
    console.log('[IndexController.preDispatch] Called');

    const authService = this.getServiceManager()
      .get('AuthenticationService');

    if (!authService.hasIdentity()) {
      this.plugin('flashMessenger').addErrorMessage(
        'You must be logged in to access this page');
      return this.plugin('redirect').toRoute('adminLoginIndex');
    }
  }

  async indexAction() {
    return this.listAction();
  }

  async listAction() {
    try {
      const viewModel = this.getView();

      console.log("[index-controller] listAction()");
      const authService = this.getServiceManager().get('AuthenticationService');
      const identity = authService.getIdentity();
      const userEmail = identity.email;

      // Get Services
      const sm = this.getServiceManager();
      const folderService = sm.get('FolderService');
      const fileMetadataService = sm.get('FileMetadataService');

      // Input Filter for View and Layout
      const InputFilter = require(global.applicationPath('/library/input-filter/input-filter'));
      const inputFilter = InputFilter.factory({
        view: {
          required: false,
          validators: [{
            name: 'InArray',
            options: {
              haystack: ['my-drive', 'starred', 'recent', 'shared', 'shared-with-me', 'trash']
            }
          }]
        },
        layout: {
          required: false,
          validators: [{
            name: 'InArray',
            options: {
              haystack: ['grid', 'list']
            }
          }]
        }
      });

      inputFilter.setData(this.getRequest().getQuery());

      let viewMode = 'my-drive';
      let layoutMode = 'grid';

      // Cache Service
      const cache = sm.get('Cache');
      const cacheKey = `preferences_layout_${crypto.createHash('md5').update(userEmail).digest('hex')}`;

      if (inputFilter.isValid()) {
        const values = inputFilter.getValues();
        if (values.view) viewMode = values.view;

        if (values.layout) {
          layoutMode = values.layout;
          // Save preference
          cache.save(layoutMode, cacheKey);
        } else {
          // Try loading from cache if not in query
          const cachedLayout = cache.load(cacheKey);
          if (cachedLayout) {
            layoutMode = cachedLayout;
          }
        }
        console.log(`[IndexController] viewMode resolved to: ${viewMode}`);
      } else {
        console.warn('[IndexController] InputFilter failed:', inputFilter.getMessages());
      }

      // Fetch Folders via Service
      const folders = await folderService.getFoldersByUserEmail(userEmail);
      console.log(`[IndexController] Fetched Folders: ${folders.length}`);

      // Determine current folder ID
      let currentFolderId = this.getQuery('id') || this.getParam('id');
      if (currentFolderId === 'undefined') {
        currentFolderId = null;
      }
      // Resolve Root Folder ID (Always needed for navigation)
      let rootFolder = null;
      try {
        rootFolder = await folderService.getRootFolderByUserEmail(userEmail);
      } catch (e) {
        console.error('[IndexController] Error resolving root folder:', e);
      }

      // If root folder is still null (DB error?), we might need to handle it or let it fail downstream.
      // For now, if no root folder, we can't really show "My Drive".
      const rootFolderId = rootFolder ? rootFolder.folder_id : null;

      if ((!currentFolderId || currentFolderId === 'undefined') && rootFolderId) {
        currentFolderId = rootFolderId;
        console.log(`[IndexController] Resolved Root ID: ${currentFolderId}`);
      }
      console.log(`[IndexController] Current Folder ID: ${currentFolderId}`);

      // Resolve Tenant ID (needed for subfolders and recent files)
      let tenantId = null;
      if (rootFolder) {
        tenantId = rootFolder.tenant_id;
      } else {
        // Fallback: fetch tenantId from user record
        const ft = await folderService.getFolderTable();
        const Select = require(global.applicationPath('/library/db/sql/select'));
        const q = new Select(ft.adapter)
          .from({ u: 'app_user' }, ['tm.tenant_id'])
          .join({ tm: 'tenant_member' }, 'tm.user_id = u.user_id')
          .where('u.email = ?', userEmail)
          .limit(1);
        const res = await q.execute();
        if (res && res.rows && res.rows.length > 0) {
          tenantId = res.rows[0].tenant_id;
        }
      }

      // Fetch Files via Service
      let filesList = [];
      try {
        if (viewMode === 'recent') {
          console.log('[IndexController] Fetching recent files for tenant:', tenantId);
          filesList = await fileMetadataService.getRecentFiles(userEmail, 50, tenantId);
        } else if (viewMode === 'starred') {
          // ... (starred logic handled below)
        } else if (viewMode === 'shared-with-me') {
          console.log('[IndexController] Fetching shared files');
          filesList = await fileMetadataService.getSharedFiles(userEmail, 50);
        } else {
          filesList = await fileMetadataService.getFilesByFolder(userEmail, currentFolderId);
        }
      } catch (e) {
        console.error('[IndexController] Error fetching files:', e);
      }
      console.log(`[IndexController] Files found: ${filesList.length}`);

      // Fetch Subfolders via Service
      let subFolders = [];
      try {
        if (tenantId && viewMode !== 'recent' && viewMode !== 'starred') {
          subFolders = await folderService.getFoldersByParent(currentFolderId, tenantId);
        } else if (!tenantId) {
          console.error('[IndexController] Could not resolve tenantId for subfolders');
        }

      } catch (e) {
        console.error('[IndexController] Error fetching subfolders:', e);
      }
      console.log(`[IndexController] Sub-folders found: ${subFolders.length}`);

      // Fetch Starred Files
      let starredFileIds = [];
      try {
        const fileStarService = sm.get('FileStarService');
        const starredFiles = await fileStarService.getStarredFiles(userEmail);
        starredFileIds = starredFiles.map(sf => sf.getFileId());
      } catch (e) {
        console.error('[IndexController] Error fetching starred files:', e);
      }


      // Moved InputFilter logic to top


      // Load Expanded Folders State from Cache
      const expandCacheKey = `folder_expanded_state_${crypto.createHash('md5').update(userEmail).digest('hex')}`;
      const expandedFolderIds = cache.load(expandCacheKey) || [];

      console.log('[IndexController] Loaded expanded folders from cache:', expandedFolderIds);

      // If view is 'starred', override the file list
      if (viewMode === 'starred') {
        if (starredFileIds.length > 0) {
          try {
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
          } catch (e) {
            console.error('[IndexController] Error fetching starred file details:', e);
            filesList = [];
          }
        } else {
          filesList = [];
        }
      } else if (viewMode === 'recent') {
        // Already handled above
      }

      // Fetch Tree directly from Service
      let folderTree = [];
      try {
        folderTree = await folderService.getFolderTreeByUserEmail(userEmail);
      } catch (e) {
        console.error('[IndexController] Error fetching folder tree:', e);
      }
      console.log(`[IndexController] Folder Tree built. Top level items: ${folderTree.length}`);

      // Prepare items for view
      const prepareItem = (item) => {
        if (!item) return item;
        return (typeof item.toObject === 'function') ? item.toObject() : item;
      };

      const mappedFilesList = filesList.map(prepareItem);
      const mappedSubFolders = subFolders.map(prepareItem);

      viewModel.setVariable('folderTree', folderTree);
      viewModel.setVariable('currentFolderId', currentFolderId);
      viewModel.setVariable('rootFolderId', rootFolderId);

      viewModel.setVariable('viewMode', viewMode);
      viewModel.setVariable('layoutMode', layoutMode);

      viewModel.setVariable('filesList', mappedFilesList);
      viewModel.setVariable('subFolders', (viewMode === 'starred' || viewMode === 'recent' || viewMode === 'shared-with-me') ? [] : mappedSubFolders);
      viewModel.setVariable('starredFileIds', starredFileIds);
      viewModel.setVariable('expandedFolderIds', expandedFolderIds);

      return viewModel;

    } catch (error) {
      console.error('Error in listAction:', error);
      this.getView().setVariable('folderTree', []);
      return this.getView();
    }
  }

}

module.exports = IndexController;
