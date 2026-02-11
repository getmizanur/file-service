/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class FilePermissionEntity extends AbstractEntity {
  static schema = {
    permission_id: null,
    tenant_id: null,
    file_id: null,
    user_id: null,
    group_id: null,
    role: 'viewer',
    created_by: null,
    created_dt: null
  };
  static ROLE = {
    VIEWER: 'viewer',
    EDITOR: 'editor',
    OWNER: 'owner'
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getPermissionId() { return this.get('permission_id'); }
  getTenantId() { return this.get('tenant_id'); }
  getFileId() { return this.get('file_id'); }
  getUserId() { return this.get('user_id'); }
  getGroupId() { return this.get('group_id'); }
  getRole() { return this.get('role', 'viewer'); }
  getCreatedBy() { return this.get('created_by'); }
  getCreatedDt() { return this.get('created_dt'); }
  // Setters
  setPermissionId(id) { return this.set('permission_id', id); }
  setTenantId(id) { return this.set('tenant_id', id); }
  setFileId(id) { return this.set('file_id', id); }
  setUserId(id) { return this.set('user_id', id); }
  setGroupId(id) { return this.set('group_id', id); }
  setRole(role) {
    if (!Object.values(FilePermissionEntity.ROLE).includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    return this.set('role', role);
  }
  setCreatedBy(id) { return this.set('created_by', id); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  // Logic
  isOwner() { return this.getRole() === FilePermissionEntity.ROLE.OWNER; }
  canEdit() { return [FilePermissionEntity.ROLE.EDITOR, FilePermissionEntity.ROLE.OWNER].includes(this.getRole()); }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'tenant_id': { required: true },
        'file_id': { required: true },
        'role': {
          required: true,
          validators: [{ name: 'InArray', options: { haystack: Object.values(FilePermissionEntity.ROLE) } }]
        }
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
module.exports = FilePermissionEntity;
