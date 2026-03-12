// application/module/admin/controller/rest/restore-items-controller.js
const AdminRestController = require('./admin-rest-controller');

class RestoreItemsController extends AdminRestController {

  /**
   * POST /api/items/restore
   * Body: { items: [{ id, type }] }
   */
  async postAction() {
    try {
      const { email } = await this.requireIdentity();
      const items = this.getRequest().getPost('items');

      if (!Array.isArray(items) || items.length === 0) {
        return this.ok({ success: false, error: 'No items selected' });
      }

      const sm = this.getSm();
      const fileService = sm.get('FileMetadataService');
      const folderService = sm.get('FolderService');
      const results = [];

      for (const item of items) {
        try {
          if (item.type === 'file') {
            await fileService.restoreFile(item.id, email);
            results.push({ id: item.id, type: 'file', success: true });
          } else if (item.type === 'folder') {
            await folderService.restoreFolder(item.id, email);
            results.push({ id: item.id, type: 'folder', success: true });
          }
        } catch (e) {
          console.error(`[RestoreItemsController] Failed to restore ${item.type} ${item.id}:`, e.message);
          results.push({ id: item.id, type: item.type, success: false, error: e.message });
        }
      }

      return this.ok({ success: true, results });
    } catch (e) {
      console.error('[RestoreItemsController] Error:', e.message);
      return this.handleException(e);
    }
  }
}

module.exports = RestoreItemsController;
