// application/module/admin/controller/rest/empty-trash-controller.js
const AdminRestController = require('./admin-rest-controller');

class EmptyTrashController extends AdminRestController {

  /**
   * POST /api/trash/empty
   * Permanently deletes all trashed files and folders for the current tenant.
   */
  async postAction() {
    try {
      const { email } = await this.requireIdentity();
      await this.getSm().get('FileMetadataService').emptyTrash(email);
      return this.ok({ success: true });
    } catch (e) {
      console.error('[EmptyTrashController] Error:', e.message);
      return this.handleException(e);
    }
  }
}

module.exports = EmptyTrashController;
