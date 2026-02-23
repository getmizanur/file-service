// application/module/admin/controller/rest/folder-star-controller.js
const AdminRestController = require('./admin-rest-controller');

class FolderStarController extends AdminRestController {

  /**
   * Toggle star status
   * POST /api/folder/star/toggle
   * Body: { folder_id }
   */
  async postAction() {
    try {
      const { email } = await this.requireIdentity();
      const { folder_id: folderId } = this.validate(
        { folder_id: { required: true } },
        this.getRequest().getPost()
      );

      const result = await this.getSm().get('FolderStarService').toggleStarByEmail(folderId, email);

      return this.ok(result);
    } catch (e) {
      return this.handleException(e);
    }
  }
}

module.exports = FolderStarController;
