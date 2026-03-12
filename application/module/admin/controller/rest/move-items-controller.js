// application/module/admin/controller/rest/move-items-controller.js
const AdminRestController = require('./admin-rest-controller');

class MoveItemsController extends AdminRestController {

  /**
   * POST /api/items/move
   * Body: { items: [{ id, type }], targetFolderId }
   */
  async postAction() {
    try {
      const { email } = await this.requireIdentity();
      const items = this.getRequest().getPost('items');
      const targetFolderId = this.getRequest().getPost('targetFolderId');

      if (!targetFolderId) {
        return this.ok({ success: false, error: 'Target folder is required' });
      }

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
            await fileService.moveFile(item.id, targetFolderId, email);
            results.push({ id: item.id, type: 'file', success: true });
          } else if (item.type === 'folder') {
            await folderService.moveFolder(item.id, targetFolderId, email);
            results.push({ id: item.id, type: 'folder', success: true });
          }
        } catch (e) {
          console.error(`[MoveItemsController] Failed to move ${item.type} ${item.id}:`, e.message);
          results.push({ id: item.id, type: item.type, success: false, error: e.message });
        }
      }

      return this.ok({ success: true, results });
    } catch (e) {
      console.error('[MoveItemsController] Error:', e.message);
      return this.handleException(e);
    }
  }
}

module.exports = MoveItemsController;
