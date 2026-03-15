// application/module/admin/controller/rest/file-link-publish-controller.js
const AdminRestController = require('./admin-rest-controller');

class FileLinkPublishController extends AdminRestController {

  /**
   * POST /api/file/link/publish
   * Generate/Get public link key (Publish File)
   */
  async postAction() {
    try {
      const { email } = await this.requireIdentity();
      const { file_id: fileId } = this.validate(
        { file_id: { required: true, validators: [{ name: 'Uuid' }] } },
        this.getRequest().getPost()
      );

      const publicKey = await this.getSm().get('FileMetadataService')
        .publishFile(fileId, email);

      const baseUrl = (process.env.BASE_URL || '').replace(/\/+$/, '');
      const link = baseUrl ? `${baseUrl}/p/${publicKey}` : `/p/${publicKey}`;

      return this.ok({ success: true, data: { link, public_key: publicKey } });
    } catch (e) {
      return this.handleException(e);
    }
  }
}

module.exports = FileLinkPublishController;
