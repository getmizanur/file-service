// application/entity/folder-entity.js
/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));

class FolderEntity extends AbstractEntity {
  static schema = {
    folder_id: null,
    tenant_id: null,
    parent_folder_id: null,
    name: null,
    created_by: null,
    created_dt: null,
    owner: null,
    deleted_at: null,
    deleted_by: null
  };

  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }

  // Getters
  getFolderId() { return this.get('folder_id'); }
  getTenantId() { return this.get('tenant_id'); }
  getParentFolderId() { return this.get('parent_folder_id'); }
  getName() { return this.get('name'); }
  getCreatedBy() { return this.get('created_by'); }
  getCreatedDt() { return this.get('created_dt'); }
  getDeletedAt() { return this.get('deleted_at'); }
  getDeletedBy() { return this.get('deleted_by'); }

  // Setters
  setFolderId(id) { return this.set('folder_id', id); }
  setTenantId(id) { return this.set('tenant_id', id); }
  setParentFolderId(id) { return this.set('parent_folder_id', id); }
  setName(name) { return this.set('name', name); }
  setCreatedBy(id) { return this.set('created_by', id); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  setDeletedAt(dt) { return this.set('deleted_at', dt); }
  setDeletedBy(id) { return this.set('deleted_by', id); }

  // Logic
  isRoot() { return this.getParentFolderId() === null; }
  isDeleted() { return this.getDeletedAt() !== null; }

  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'tenant_id': { required: true },
        'name': { required: true }
      });
    }
    return this.inputFilter;
  }

  isValid() {
    const filter = this.getInputFilter();
    filter.setData(this.getObjectCopy());
    return filter.isValid();
  }
}

module.exports = FolderEntity;
