const Controller = require(
  global.applicationPath('/library/mvc/controller/base-controller'));



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

  }

  async indexAction() {
    return this.listAction();
  }

  async listAction() {
    try {
      const viewModel = this.getView();

      console.log("[index-controller] listAction()");

      // Hardcoded context for now as requested
      const userEmail = 'admin@dailypolitics.com';

      // Get Services
      const sm = this.getServiceManager();
      const folderService = sm.get('FolderService');
      const fileMetadataService = sm.get('FileMetadataService');

      // Fetch Folders via Service
      const folders = await folderService.getFoldersByUserEmail(userEmail);
      console.log(`[IndexController] Fetched Folders: ${folders.length}`);

      // Determine current folder ID
      let currentFolderId = this.getQuery('id') || this.getParam('id');
      if (currentFolderId === 'undefined') {
        currentFolderId = null;
      }
      const placeholderId = 'a1000000-0000-0000-0000-000000000001';

      // Resolve Root Folder ID (Always needed for navigation)
      let rootFolder = null;
      try {
        rootFolder = await folderService.getRootFolderByUserEmail(userEmail);
      } catch (e) {
        console.error('[IndexController] Error resolving root folder:', e);
      }
      const rootFolderId = rootFolder ? rootFolder.folder_id : placeholderId;

      if (!currentFolderId || currentFolderId === placeholderId) {
        currentFolderId = rootFolderId;
        console.log(`[IndexController] Resolved Root ID: ${currentFolderId}`);
      }
      console.log(`[IndexController] Current Folder ID: ${currentFolderId}`);

      // Fetch Files via Service
      let filesList = [];
      try {
        filesList = await fileMetadataService.getFilesByFolder(userEmail, currentFolderId);
      } catch (e) {
        console.error('[IndexController] Error fetching files:', e);
      }
      console.log(`[IndexController] Files found: ${filesList.length}`);

      // Fetch Subfolders via Service
      let subFolders = [];
      try {
        // We need tenant_id for fetchByParent
        // Reuse logic to get tenant_id if not already available
        let tenantId = null;

        // Quick lookup for tenantId since we need it for the tree/folders anyway
        // For now, we can get it from the user record if we fetched it, or fetch it now.
        // We haven't fetched the full user record in this scope properly yet.
        // Let's do it safely.

        const appUserTable = new (require('../../../table/app-user-table'))({
          adapter: folderService.getFolderTable().then(t => t.adapter) // Wait, this is async
        });
        // Actually, folderService.getFolderTable() is async.
        // Let's use a simpler way if possible or just fetch it.

        // Better: usage existing service if possible, or just raw query if needed.
        // But we have `folderService.getRootFolderByUserEmail` which returns a folder. 
        // That folder has tenant_id!
        if (rootFolder) {
          tenantId = rootFolder.tenant_id;
        } else {
          // Fallback if root folder resolution failed or placeholders used
          // We might need to fetch user. 
          // Let's try to get it from the first folder in the list if available? Unreliable.
          // Let's fetch the user.
          // We can use the folder table adapter.
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

        if (tenantId) {
          subFolders = await folderService.getFoldersByParent(currentFolderId, tenantId);
        } else {
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

      let viewMode = this.getQuery('view') || 'my-drive'; // Default to 'my-drive'
      const layoutMode = this.getQuery('layout') || 'grid'; // Default to grid

      // Safety check: if view is weirdly 'grid' or 'list' (from old links), fix it.
      if (viewMode === 'grid' || viewMode === 'list') {
        viewMode = 'my-drive';
      }

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
      viewModel.setVariable('subFolders', (viewMode === 'starred') ? [] : mappedSubFolders);
      viewModel.setVariable('starredFileIds', starredFileIds);

      return viewModel;

    } catch (error) {
      console.error('Error in listAction:', error);
      this.getView().setVariable('folderTree', []);
      return this.getView();
    }
  }

}

module.exports = IndexController;
