// application/module/admin/controller/rest/file-link-toggle-controller.js
const AdminRestController = require('./admin-rest-controller');

class FileLinkToggleController extends AdminRestController {

  /**
   * POST /api/file/link/toggle-public
   * Enable/Disable public link
   */
  async postAction() {
    try {
      const { email } = await this.requireIdentity();
      const { file_id: fileId, state } = this.validate(
        {
          file_id: { required: true, validators: [{ name: 'Uuid' }] },
          state: { required: true, validators: [{ name: 'InArray', options: { haystack: ['on', 'off'] } }] }
        },
        this.getRequest().getPost()
      );

      const service = this.getSm().get('FileMetadataService');

      if (state === 'on') {
        const key = await service.publishFile(fileId, email);
        return this.ok({ success: true, data: { status: 'published', public_key: key } });
      } else {
        await service.unpublishFile(fileId, email);
        return this.ok({ success: true, data: { status: 'unpublished' } });
      }
    } catch (e) {
      return this.handleException(e);
    }
  }
}

module.exports = FileLinkToggleController;
