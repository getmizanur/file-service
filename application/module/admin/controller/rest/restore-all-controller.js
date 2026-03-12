// application/module/admin/controller/rest/restore-all-controller.js
const AdminRestController = require('./admin-rest-controller');

class RestoreAllController extends AdminRestController {

  /**
   * POST /api/trash/restore-all
   * Restores all trashed files and folders for the current tenant.
   */
  async postAction() {
    try {
      const { email } = await this.requireIdentity();
      await this.getSm().get('FileMetadataService').restoreAllTrashed(email);
      return this.ok({ success: true });
    } catch (e) {
      console.error('[RestoreAllController] Error:', e.message);
      return this.handleException(e);
    }
  }
}

module.exports = RestoreAllController;
