const RestController = require(global.applicationPath('/library/mvc/controller/rest-controller'));
const crypto = require('crypto');

class FolderStateController extends RestController {

  /**
   * POST /admin/folder/state/toggle
   * Toggle folder expansion state in session
   */
  async postAction() {
    try {
      const req = this.getRequest();
      const user = this.getUser();
      if (!user || !user.email) {
        return this.json({ success: false, message: 'User not authenticated' });
      }

      if (!req.isPost()) {
        return this.json({ success: false, message: 'Invalid method' });
      }

      const folderId = req.getPost('folderId');
      const expanded = req.getPost('expanded') === 'true';

      if (!folderId) {
        return this.json({ success: false, message: 'Missing folderId' });
      }

      // Generate Cache Key
      const cacheKey = this._getCacheKey(user.email);
      const cache = this.getServiceManager().get('Cache');

      // Load current state from Cache
      let expandedFolders = cache.load(cacheKey) || [];

      if (expanded) {
        // Add if not exists
        if (!expandedFolders.includes(folderId)) {
          expandedFolders.push(folderId);
        }
      } else {
        // Remove if exists
        expandedFolders = expandedFolders.filter(id => id !== folderId);
      }

      // Save to Cache (Default TTL)
      cache.save(expandedFolders, cacheKey);

      console.log(`[FolderStateController] Updated cache for ${user.email}:`, expandedFolders);

      return this.json({
        success: true,
        expandedFolders: expandedFolders
      });

    } catch (e) {
      console.error('[FolderStateController] Error:', e);
      return this.json({ success: false, message: e.message });
    }
  }

  /**
   * GET /admin/folder/state/toggle
   * Fetch ALL expanded folders from cache
   */
  async indexAction() {
    try {
      const user = this.getUser();
      if (!user || !user.email) {
        return this.json({ success: false, message: 'User not authenticated' });
      }

      const cacheKey = this._getCacheKey(user.email);
      const cache = this.getServiceManager().get('Cache');

      const expandedFolders = cache.load(cacheKey) || [];

      return this.json({
        success: true,
        expandedFolders: expandedFolders
      });
    } catch (e) {
      return this.json({ success: false, message: e.message });
    }
  }

  /**
   * GET /admin/folder/state/toggle?id=123
   * Check if a SPECIFIC folder is expanded
   */
  async getAction() {
    try {
      const user = this.getUser();
      if (!user || !user.email) {
        return this.json({ success: false, message: 'User not authenticated' });
      }

      const folderId = this.getResourceId();
      if (!folderId) {
        return this.json({ success: false, message: 'Missing ID' });
      }

      const cacheKey = this._getCacheKey(user.email);
      const cache = this.getServiceManager().get('Cache');

      const expandedFolders = cache.load(cacheKey) || [];
      const isExpanded = expandedFolders.includes(folderId);

      return this.json({
        success: true,
        id: folderId,
        isExpanded: isExpanded
      });
    } catch (e) {
      return this.json({ success: false, message: e.message });
    }
  }

  _getCacheKey(email) {
    return `folder_expanded_state_${crypto.createHash('md5').update(email).digest('hex')}`;
  }
}

module.exports = FolderStateController;
