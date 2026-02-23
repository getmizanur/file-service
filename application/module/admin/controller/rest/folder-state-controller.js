// application/module/admin/controller/rest/folder-state-controller.js
const AdminRestController = require('./admin-rest-controller');
const crypto = require('crypto');

class FolderStateController extends AdminRestController {

  /**
   * POST /api/folder/state/toggle
   * Toggle folder expansion state in cache
   */
  async postAction() {
    try {
      const { email } = await this.requireIdentity();
      const req = this.getRequest();

      const folderId = req.getPost('folderId');
      const expanded = req.getPost('expanded') === 'true';

      if (!folderId) {
        return this.ok({ success: false, message: 'Missing folderId' });
      }

      const cacheKey = this._getCacheKey(email);
      const cache = this.getSm().get('Cache');

      let expandedFolders = cache.load(cacheKey) || [];

      if (expanded) {
        if (!expandedFolders.includes(folderId)) {
          expandedFolders.push(folderId);
        }
      } else {
        expandedFolders = expandedFolders.filter(id => id !== folderId);
      }

      cache.save(expandedFolders, cacheKey);

      return this.ok({ success: true, expandedFolders });
    } catch (e) {
      console.error('[FolderStateController] Error:', e);
      return this.ok({ success: false, message: e.message });
    }
  }

  /**
   * GET /api/folder/state/toggle
   * Fetch ALL expanded folders from cache
   */
  async indexAction() {
    try {
      const { email } = await this.requireIdentity();
      const cacheKey = this._getCacheKey(email);
      const expandedFolders = this.getSm().get('Cache').load(cacheKey) || [];

      return this.ok({ success: true, expandedFolders });
    } catch (e) {
      return this.ok({ success: false, message: e.message });
    }
  }

  /**
   * GET /api/folder/state/toggle?id=123
   * Check if a SPECIFIC folder is expanded
   */
  async getAction() {
    try {
      const { email } = await this.requireIdentity();
      const folderId = this.getResourceId();

      if (!folderId) {
        return this.ok({ success: false, message: 'Missing ID' });
      }

      const cacheKey = this._getCacheKey(email);
      const expandedFolders = this.getSm().get('Cache').load(cacheKey) || [];

      return this.ok({
        success: true,
        id: folderId,
        isExpanded: expandedFolders.includes(folderId)
      });
    } catch (e) {
      return this.ok({ success: false, message: e.message });
    }
  }

  _getCacheKey(email) {
    return `folder_expanded_state_${crypto.createHash('md5').update(email).digest('hex')}`;
  }
}

module.exports = FolderStateController;
