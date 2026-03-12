// application/module/admin/controller/rest/calculate-size-controller.js
const AdminRestController = require('./admin-rest-controller');

class CalculateSizeController extends AdminRestController {

  /**
   * POST /api/items/calculate-size
   * Body: { items: [{ id, type }] }
   * Returns: { success, total_bytes, file_count, formatted }
   */
  async postAction() {
    try {
      const { email } = await this.requireIdentity();
      const items = this.getRequest().getPost('items');

      if (!Array.isArray(items) || items.length === 0) {
        return this.ok({ success: false, error: 'No items selected' });
      }

      const { total_bytes, file_count } = await this.getSm()
        .get('FileMetadataService')
        .calculateSize(items, email);

      return this.ok({
        success: true,
        total_bytes,
        file_count,
        formatted: CalculateSizeController.formatBytes(total_bytes)
      });
    } catch (e) {
      console.error('[CalculateSizeController] Error:', e.message);
      return this.handleException(e);
    }
  }

  static formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return value % 1 === 0
      ? `${value} ${units[i]}`
      : `${value.toFixed(2)} ${units[i]}`;
  }
}

module.exports = CalculateSizeController;
