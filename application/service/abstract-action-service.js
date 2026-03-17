// application/service/abstract-action-service.js
const AbstractService = require('./abstract-service');
const crypto = require('node:crypto');

class AbstractActionService extends AbstractService {
  constructor() {
    if (new.target === AbstractActionService) {
      throw new TypeError('Cannot construct AbstractActionService instances directly');
    }
    super();
  }

  _cachedSet(qcs, key, queryFn, { ttl, registries }) {
    if (!qcs) return queryFn();
    return qcs.cacheThrough(key, async () => [...(await queryFn())], { ttl, registries })
      .then(arr => new Set(arr));
  }

  async _populateSharedFlags(mergedItems, sm, tenantId, qcs) {
    try {
      const fileIds = mergedItems.filter(i => i.item_type === 'file' && i.id).map(i => i.id);
      const folderIds = mergedItems.filter(i => i.item_type === 'folder' && (i.folder_id || i.id)).map(i => i.folder_id || i.id);

      const tenantReg = tenantId ? `registry:tenant:${tenantId}` : null;
      const registries = tenantReg ? [tenantReg] : [];
      const ttl = 30;

      const idHash = (ids) => {
        if (ids.length === 0) return '';
        return crypto.createHash('md5').update(ids.slice().sort().join(',')).digest('hex');
      };

      const [sharedFileIds, sharedFolderIds, userSharedFileIds] = await Promise.all([
        fileIds.length && tenantId
          ? this._cachedSet(qcs, `shared:files:${tenantId}:${idHash(fileIds)}`, () => this.getTable('ShareLinkTable').fetchSharedFileIds(tenantId, fileIds), { ttl, registries })
          : new Set(),
        folderIds.length && tenantId
          ? this._cachedSet(qcs, `shared:folders:${tenantId}:${idHash(folderIds)}`, () => this.getTable('FolderShareLinkTable').fetchSharedFolderIds(tenantId, folderIds), { ttl, registries })
          : new Set(),
        fileIds.length && tenantId
          ? this._cachedSet(qcs, `shared:perms:${tenantId}:${idHash(fileIds)}`, () => this.getTable('FilePermissionTable').fetchUserSharedFileIds(fileIds, tenantId), { ttl, registries })
          : new Set()
      ]);

      mergedItems.forEach(item => {
        if (item.item_type === 'file') {
          item.is_shared = sharedFileIds.has(item.id) || userSharedFileIds.has(item.id);
        } else {
          item.is_shared = sharedFolderIds.has(item.folder_id || item.id);
        }
      });
    } catch (e) {
      console.error(`[${this.constructor.name}] Error populating is_shared:`, e);
    }
  }

  async _populateDerivativeFlags(mergedItems, sm, qcs = null, tenantId = null) {
    try {
      const fileIds = mergedItems.filter(i => i.item_type === 'file' && i.id).map(i => i.id);
      if (fileIds.length === 0) return;

      const derivativeTable = this.getTable('FileDerivativeTable');

      const idHash = crypto.createHash('md5').update(fileIds.slice().sort().join(',')).digest('hex');
      const ttl = 60;
      const tenantReg = tenantId ? `registry:tenant:${tenantId}` : null;
      const registries = tenantReg ? [tenantReg] : [];

      const cacheKey = `deriv:flags:${idHash}`;
      const derivFlags = qcs
        ? await qcs.cacheThrough(cacheKey, () => derivativeTable.fetchDerivativeFlags(fileIds), { ttl, registries })
        : await derivativeTable.fetchDerivativeFlags(fileIds);

      mergedItems.forEach(item => {
        if (item.item_type === 'file') {
          const flags = derivFlags[item.id];
          item.has_thumbnail = !!flags?.has_thumbnail;
          item.has_preview_pages = !!flags?.has_preview_pages;
        }
      });
    } catch (e) {
      console.error(`[${this.constructor.name}] Error populating has_thumbnail:`, e);
    }
  }
}

module.exports = AbstractActionService;
