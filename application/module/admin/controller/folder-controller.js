const Controller = require(global.applicationPath('/library/mvc/controller/base-controller'));

class FolderController extends Controller {

  async createAction() {
    let parentFolderId = null;
    try {
      // 1. Get Params from Request
      // User requested getQuery()
      parentFolderId = this.getRequest().getPost('parent_folder_id');
      const name = this.getRequest().getPost('name');
      const userEmail = 'admin@dailypolitics.com'; // Hardcoded for now

      console.log(`[FolderController] Create Folder: Name=${name}, Parent=${parentFolderId}`);

      // 2. Validate
      if (!name) {
        throw new Error('Folder name is required');
      }

      // 3. Create Folder via Service
      const folderService = this.getServiceManager().get('FolderService');

      const newFolderId = await folderService.createFolder(userEmail, name, parentFolderId);

      console.log(`[FolderController] Folder created successfully: ${newFolderId}`);

      // 4. Redirect Back (or to the new folder)
      return this.plugin('redirect').toRoute('adminIndexList', null, { query: { id: parentFolderId } });

    } catch (e) {
      console.error(e);
      // Fallback redirect if parentFolderId is invalid/missing
      return this.plugin('redirect').toRoute('adminIndexList', null, { query: { id: parentFolderId } });
    }
  }
  async deleteAction() {
    let folderId = null;
    let parentFolderId = null;
    try {
      folderId = this.getRequest().getQuery('id');
      const userEmail = 'admin@dailypolitics.com'; // Hardcoded

      if (!folderId) throw new Error('Folder ID is required');

      const folderService = this.getServiceManager().get('FolderService');

      // Get folder first to know parent for redirect
      const folder = await folderService.getFolderById(folderId);
      if (folder) {
        parentFolderId = folder.getParentFolderId();
        console.log(`[FolderController] Deleting folder ${folderId}. Parent ID: ${parentFolderId}`);
      } else {
        console.warn(`[FolderController] Folder not found: ${folderId}`);
      }

      await folderService.deleteFolder(folderId, userEmail);

      // Redirect to parent or root
      const queryParams = {};

      if (!parentFolderId) {
        // Fallback: If parent is null (e.g. top-level folder), redirect to User's Root Folder
        try {
          const rootFolder = await folderService.getRootFolderByUserEmail(userEmail);
          if (rootFolder) {
            parentFolderId = rootFolder.folder_id;
            console.log(`[FolderController] Parent was null, resolved Root ID: ${parentFolderId}`);
          }
        } catch (err) {
          console.warn('[FolderController] Failed to resolve root folder for redirect:', err.message);
        }
      }

      if (parentFolderId) {
        queryParams.id = parentFolderId;
      }

      return this.plugin('redirect').toRoute('adminIndexList', null, { query: { id: queryParams.id } });

    } catch (e) {
      console.error('[FolderController] Delete Error:', e.message);
      // TODO: Flash message for error (e.g., "Folder not empty")
      const queryParams = {};
      if (parentFolderId) {
        queryParams.id = parentFolderId;
      }
      return this.plugin('redirect').toRoute('adminIndexList', null, { query: { id: queryParams.id } });
    }
  }

  async updateAction() {
    try {
      const folderId = this.getRequest().getPost('folder_id');
      const name = this.getRequest().getPost('name');
      const userEmail = 'admin@dailypolitics.com'; // Hardcoded

      if (!folderId || !name) {
        throw new Error('Folder ID and Name are required');
      }

      const folderService = this.getServiceManager().get('FolderService');
      await folderService.updateFolder(folderId, name, userEmail);

      console.log(`[FolderController] Renamed folder ${folderId} to ${name}`);

      this.plugin('json').send({
        success: true,
        message: 'Folder renamed successfully'
      });

    } catch (e) {
      console.error('[FolderController] Rename Error:', e.message);

      this.plugin('json').send({ success: false, message: e.message });
    }
  }
}

module.exports = FolderController;
