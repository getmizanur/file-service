const RestController = require(global.applicationPath('/library/mvc/controller/rest-controller'));

class FolderUpdateController extends RestController {

  /**
   * POST /admin/folder/update
   * Rename folder via POST (form data)
   */
  async postAction() {
    try {
      const req = this.getRequest();
      const folderId = req.getPost('folder_id') || this.getResourceId();
      const name = req.getPost('name');
      const authService = this.getServiceManager().get('AuthenticationService');
      const userEmail = authService.getIdentity().email;

      if (!folderId || !name) {
        throw new Error('Folder ID and Name are required');
      }

      const folderService = this.getServiceManager().get('FolderService');
      await folderService.updateFolder(folderId, name, userEmail);

      console.log(`[FolderUpdateController] Renamed folder ${folderId} to ${name}`);

      return this.ok({
        success: true,
        message: 'Folder renamed successfully'
      });

    } catch (e) {
      console.error('[FolderUpdateController] Rename Error:', e.message);
      return this.handleException(e);
    }
  }
}

module.exports = FolderUpdateController;
