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
      const { file_id: fileId, email, role } = this.validate(
        {
          file_id: { required: true, validators: [{ name: 'Uuid' }] },
          email: { required: true, filters: [{ name: 'StringTrim' }, { name: 'StripTags' }] },
          role: { required: false, validators: [{ name: 'InArray', options: { haystack: ['viewer', 'editor', 'commenter'] } }] }
        },
        this.getRequest().getPost()
      );

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
      const raw = { ...req.getPost(), ...req.getQuery() };
      const { file_id: fileId, user_id: targetUserId } = this.validate(
        {
          file_id: { required: true, validators: [{ name: 'Uuid' }] },
          user_id: { required: true, validators: [{ name: 'Uuid' }] }
        },
        raw
      );

      await this.getSm().get('FileMetadataService')
        .removeUserAccess(fileId, targetUserId, email);

      return this.ok({ success: true });
    } catch (e) {
      return this.handleException(e);
    }
  }
}

module.exports = FileShareController;
