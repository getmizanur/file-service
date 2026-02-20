/* eslint-disable no-undef */
const RestController = require(global.applicationPath('/library/mvc/controller/rest-controller'));

class FolderStarController extends RestController {

  /**
   * Toggle star status
   * POST /admin/folder/star/toggle
   * Params: folder_id
   */
  async postAction() {
    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      if (!authService.hasIdentity()) {
        return this.handleException(new Error('Login required'));
      }

      const userEmail = authService.getIdentity().email;
      const folderId = this.getRequest().getPost('folder_id');

      if (!folderId) {
        return this.handleException(new Error('Folder ID is required'));
      }

      const service = this.getServiceManager().get('FolderStarService');
      const result = await service.toggleStarByEmail(folderId, userEmail);

      return this.ok(result);

    } catch (e) {
      return this.handleException(e);
    }
  }
}

module.exports = FolderStarController;
