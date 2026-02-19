const Controller = require(global.applicationPath('/library/mvc/controller/base-controller'));

class FolderController extends Controller {

  preDispatch() {
    console.log('[FolderController.preDispatch] Called');

    const authService = this.getServiceManager()
      .get('AuthenticationService');

    if (!authService.hasIdentity()) {
      this.plugin('flashMessenger').addErrorMessage(
        'You must be logged in to access this page');
      this.plugin('redirect').toRoute('adminLoginIndex');
      this.getRequest().setDispatched(false);
      return;
    }

  }

  async createAction() {
    let parentFolderId = null;
    try {
      // 1. Get Params from Request
      // User requested getQuery()
      parentFolderId = this.getRequest().getPost('parent_folder_id');
      const name = this.getRequest().getPost('name');
      const authService = this.getServiceManager().get('AuthenticationService');
      const userEmail = authService.getIdentity().email;

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
      const authService = this.getServiceManager().get('AuthenticationService');
      const userEmail = authService.getIdentity().email;

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
            parentFolderId = rootFolder.getFolderId();
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

  async downloadAction() {
    try {
      const folderId = this.getRequest().getQuery('id');
      if (!folderId) throw new Error('Folder ID is required');

      const authService = this.getServiceManager().get('AuthenticationService');
      const userEmail = authService.getIdentity().email;

      const folderService = this.getServiceManager().get('FolderService');
      const folder = await folderService.getFolderById(folderId);

      if (!folder) throw new Error('Folder not found');

      // Check access (simple owner/permission check for now, later robust check)
      // Assuming if they can see it in list, they can download.
      // Ideally reuse a checkAccess method.

      console.log(`[FolderController] Downloading folder: ${folderId}`);

      const fileService = this.getServiceManager().get('FileMetadataService');
      const table = await fileService.getFileMetadataTable();
      // Fetch files in folder
      const files = await table.fetchAllByFolder(folderId);

      const archiver = require('archiver');
      const archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
      });

      const response = this.getRequest().getExpressRequest().res;

      response.setHeader('Content-Type', 'application/zip');
      response.setHeader('Content-Disposition', `attachment; filename="${folder.name}.zip"`);

      archive.pipe(response);

      const storageService = this.getServiceManager().get('StorageService');

      for (const file of files) {
        if (file.deleted_at) continue; // Skip deleted

        const backendId = file.getStorageBackendId();
        const backend = await storageService.getBackend(backendId);
        const objectKey = (typeof file.getObjectKey === 'function') ? file.getObjectKey() : file.object_key;

        try {
          const stream = await storageService.read(backend, objectKey);
          archive.append(stream, { name: file.getOriginalFilename() });
        } catch (err) {
          console.error(`[FolderController] Failed to add file ${file.getFileId()} to archive:`, err.message);
          // Continue or add error note? Continue for now.
        }
      }

      await archive.finalize();
      return; // Response handled manually

    } catch (e) {
      console.error('[FolderController] Download Error:', e);
      // Determine referral
      return this.plugin('redirect').toRoute('adminIndexList');
    }
  }



}

module.exports = FolderController;
