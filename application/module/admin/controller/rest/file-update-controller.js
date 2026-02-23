// application/module/admin/controller/rest/file-update-controller.js
const AdminRestController = require('./admin-rest-controller');

class FileUpdateController extends AdminRestController {

  /**
   * PUT /api/file/update
   * Body: { file_id, name }
   */
  async putAction() {
    try {
      const { email } = await this.requireIdentity();
      const { file_id: fileId, name } = this.validate(
        { file_id: { required: true }, name: { required: true } },
        { ...this.getRequest().getPost(), ...this.getRequest().getQuery() }
      );

      await this.getSm().get('FileMetadataService').updateFile(fileId, name, email);

      return this.ok({ success: true, message: 'File renamed successfully' });
    } catch (e) {
      console.error('[FileUpdateController] Rename Error:', e.message);
      return this.ok({ success: false, message: e.message });
    }
  }
}

module.exports = FileUpdateController;
