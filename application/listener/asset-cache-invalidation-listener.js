// application/listener/asset-cache-invalidation-listener.js
const AbstractListener = require(globalThis.applicationPath('/library/event/abstract-listener'));

/**
 * Listens for asset events and invalidates the relevant query caches.
 *
 * Event params expected:
 *   - assetType  {string}  'file' | 'folder'
 *   - eventType  {string}  e.g. 'UPLOADED', 'DELETED', 'MOVED', ...
 *   - tenantId   {string}  tenant UUID
 *   - email      {string}  (optional) actor email — needed for folder cache
 *   - userId     {string}  (optional) actor user id — needed for suggestion cache
 *   - assetId    {string}  (optional) file/folder id — for targeted suggestion invalidation
 */
class AssetCacheInvalidationListener extends AbstractListener {
  serviceManager = null;

  setServiceManager(sm) { this.serviceManager = sm; }
  getServiceManager() { return this.serviceManager; }

  handle(event) {
    const params = event.getParams ? event.getParams() : event;
    const { assetType, eventType, tenantId, email, userId, assetId } = params;

    if (!tenantId) return;

    const qcs = this.getServiceManager().get('QueryCacheService');

    // File events
    if (assetType === 'file') {
      qcs.onFileChanged(tenantId).catch(() => {});

      if (eventType === 'PERMISSION_UPDATED') {
        qcs.onPermissionChanged(tenantId).catch(() => {});
      }
    }

    // Folder events
    if (assetType === 'folder') {
      qcs.onFolderChanged(tenantId, email).catch(() => {});
    }

    // Suggestion cache — user-wide (copy, move, delete, restore)
    if (userId && ['MOVED', 'COPIED', 'DELETED', 'RESTORED'].includes(eventType)) {
      this._invalidateSuggestionCache(tenantId, userId);
    }

    // Suggestion cache — targeted by asset (publish/unpublish)
    if (assetId && ['PUBLISHED', 'UNPUBLISHED'].includes(eventType)) {
      this._invalidateAssetSuggestionCache(tenantId, assetType, assetId);
    }
  }

  _invalidateSuggestionCache(tenantId, userId) {
    this._db().query(
      'DELETE FROM user_suggestion_cache WHERE tenant_id = $1 AND user_id = $2',
      [tenantId, userId]
    ).catch(() => {});
  }

  _invalidateAssetSuggestionCache(tenantId, assetType, assetId) {
    this._db().query(
      'DELETE FROM user_suggestion_cache WHERE tenant_id = $1 AND asset_type = $2 AND asset_id = $3',
      [tenantId, assetType, assetId]
    ).catch(() => {});
  }

  _db() {
    return this.getServiceManager().get('DbAdapter');
  }
}

module.exports = AssetCacheInvalidationListener;
