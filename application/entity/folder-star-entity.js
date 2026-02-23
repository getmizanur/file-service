// application/entity/folder-star-entity.js
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));

class FolderStarEntity extends AbstractEntity {
  static schema = {
    tenant_id: null,
    folder_id: null,
    user_id: null,
    created_dt: null
  };

  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }

  // Getters
  getTenantId() { return this.get('tenant_id'); }
  getFolderId() { return this.get('folder_id'); }
  getUserId() { return this.get('user_id'); }
  getCreatedDt() { return this.get('created_dt'); }

  // Setters
  setTenantId(id) { return this.set('tenant_id', id); }
  setFolderId(id) { return this.set('folder_id', id); }
  setUserId(id) { return this.set('user_id', id); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
}

module.exports = FolderStarEntity;
