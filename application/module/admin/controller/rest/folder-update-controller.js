// application/module/admin/controller/rest/folder-update-controller.js
const AdminRestController = require('./admin-rest-controller');

class FolderUpdateController extends AdminRestController {

  /**
   * POST /api/folder/update
   * Rename folder via POST (form data)
   */
  async postAction() {
    try {
      const { email } = await this.requireIdentity();
      const { folder_id: folderId, name } = this.validate(
        { folder_id: { required: true }, name: { required: true } },
        { ...this.getRequest().getPost(), id: this.getResourceId() }
      );

      await this.getSm().get('FolderService').updateFolder(folderId, name, email);

      return this.ok({ success: true, message: 'Folder renamed successfully' });
    } catch (e) {
      console.error('[FolderUpdateController] Rename Error:', e.message);
      return this.handleException(e);
    }
  }
}

module.exports = FolderUpdateController;
