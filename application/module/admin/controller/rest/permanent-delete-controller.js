// application/module/admin/controller/rest/permanent-delete-controller.js
const AdminRestController = require('./admin-rest-controller');

class PermanentDeleteController extends AdminRestController {

  /**
   * POST /api/items/permanent-delete
   * Body: { items: [{ id, type }] }
   *
   * Note: storage objects are NOT deleted (no delete method on StorageService).
   * Storage cleanup must be handled by a separate background job.
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
            await fileService.permanentDeleteFile(item.id, email);
            results.push({ id: item.id, type: 'file', success: true });
          } else if (item.type === 'folder') {
            await folderService.permanentDeleteFolder(item.id, email);
            results.push({ id: item.id, type: 'folder', success: true });
          }
        } catch (e) {
          console.error(`[PermanentDeleteController] Failed to permanently delete ${item.type} ${item.id}:`, e.message);
          results.push({ id: item.id, type: item.type, success: false, error: e.message });
        }
      }

      return this.ok({ success: true, results });
    } catch (e) {
      console.error('[PermanentDeleteController] Error:', e.message);
      return this.handleException(e);
    }
  }
}

module.exports = PermanentDeleteController;
