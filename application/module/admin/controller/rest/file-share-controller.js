const RestController = require(global.applicationPath('/library/mvc/controller/rest-controller'));

class FileShareController extends RestController {

  /**
   * POST /admin/file/share
   * Body: { file_id, email, role }
   */
  async postAction() {
    try {
      const req = this.getRequest();
      const { file_id: fileId, email, role } = req.getPost();

      const user = this.getUser();
      if (!user) throw new Error('User not found');

      if (!fileId || !email) throw new Error('File ID and Email required');

      // Resolve Tenant ID via FolderService (same as FilePermissionsController)
      const folderService = this.getServiceManager().get('FolderService');
      const rootFolder = await folderService.getRootFolderByUserEmail(user.email);
      const tenantId = rootFolder.tenant_id;

      const service = this.getServiceManager().get('FileMetadataService');
      console.log('[FileShareController] user identity:', JSON.stringify(user));
      console.log('[FileShareController] user_id:', user.user_id, 'tenantId:', tenantId);
      await service.shareFileWithUser(fileId, email, role || 'viewer', user.user_id, tenantId);

      return this.ok({ success: true });
    } catch (e) {
      return this.handleException(e);
    }
  }

  /**
   * DELETE /admin/file/unshare
   * Body: { file_id, user_id }
   */
  async deleteAction() {
    try {
      const req = this.getRequest();
      // Since standard DELETE might not parse body in some setups, we check query too if needed.
      // But admin.js will send body x-www-form-urlencoded.
      // BaseController should parse it if content-type is set.
      const fileId = req.getPost('file_id') || req.getQuery('file_id');
      const targetUserId = req.getPost('user_id') || req.getQuery('user_id');
      const authService = this.getServiceManager().get('AuthenticationService');
      const userEmail = authService.getIdentity().email;

      if (!fileId || !targetUserId) {
        // Try reading raw body if needed, but getPost should work if body-parser works.
        // If not found in Body or Query, throw error.
        throw new Error('File ID and Target User ID required');
      }

      const service = this.getServiceManager().get('FileMetadataService');
      await service.removeUserAccess(fileId, targetUserId, userEmail);

      return this.ok({ success: true });
    } catch (e) {
      return this.handleException(e);
    }
  }

}

module.exports = FileShareController;
