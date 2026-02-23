// application/module/admin/controller/rest/file-share-controller.js
const AdminRestController = require('./admin-rest-controller');

class FileShareController extends AdminRestController {

  /**
   * POST /api/file/share
   * Body: { file_id, email, role }
   */
  async postAction() {
    try {
      const { user_id, tenant_id } = await this.requireUserContext();
      const req = this.getRequest();
      const { file_id: fileId, email, role } = req.getPost();

      if (!fileId || !email) throw new Error('File ID and Email required');

      await this.getSm().get('FileMetadataService')
        .shareFileWithUser(fileId, email, role || 'viewer', user_id, tenant_id);

      return this.ok({ success: true });
    } catch (e) {
      return this.handleException(e);
    }
  }

  /**
   * DELETE /api/file/unshare
   * Body/Query: { file_id, user_id }
   */
  async deleteAction() {
    try {
      const { email } = await this.requireIdentity();
      const req = this.getRequest();
      const fileId = req.getPost('file_id') || req.getQuery('file_id');
      const targetUserId = req.getPost('user_id') || req.getQuery('user_id');

      if (!fileId || !targetUserId) throw new Error('File ID and Target User ID required');

      await this.getSm().get('FileMetadataService')
        .removeUserAccess(fileId, targetUserId, email);

      return this.ok({ success: true });
    } catch (e) {
      return this.handleException(e);
    }
  }
}

module.exports = FileShareController;
