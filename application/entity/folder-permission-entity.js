// application/entity/folder-permission-entity.js
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));

class FolderPermissionEntity extends AbstractEntity {
  static schema = {
    permission_id: null,
    tenant_id: null,
    folder_id: null,
    user_id: null,
    group_id: null,
    role: 'viewer',
    inherit_to_children: true,
    created_by: null,
    created_dt: null
  };

  static ROLE = {
    OWNER: 'owner',
    EDITOR: 'editor',
    COMMENTER: 'commenter',
    VIEWER: 'viewer'
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
  getFolderId() { return this.get('folder_id'); }
  getUserId() { return this.get('user_id'); }
  getGroupId() { return this.get('group_id'); }
  getRole() { return this.get('role', 'viewer'); }
  getInheritToChildren() { return this.get('inherit_to_children', true); }
  getCreatedBy() { return this.get('created_by'); }
  getCreatedDt() { return this.get('created_dt'); }

  // Setters
  setPermissionId(id) { return this.set('permission_id', id); }
  setTenantId(id) { return this.set('tenant_id', id); }
  setFolderId(id) { return this.set('folder_id', id); }
  setUserId(id) { return this.set('user_id', id); }
  setGroupId(id) { return this.set('group_id', id); }
  setRole(role) {
    if (!Object.values(FolderPermissionEntity.ROLE).includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    return this.set('role', role);
  }
  setInheritToChildren(v) { return this.set('inherit_to_children', v); }
  setCreatedBy(id) { return this.set('created_by', id); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }

  // Logic
  isOwner() { return this.getRole() === FolderPermissionEntity.ROLE.OWNER; }
  canEdit() {
    return [FolderPermissionEntity.ROLE.EDITOR, FolderPermissionEntity.ROLE.OWNER]
      .includes(this.getRole());
  }

  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'tenant_id': { required: true },
        'folder_id': { required: true },
        'role': {
          required: true,
          validators: [{
            name: 'InArray',
            options: { haystack: Object.values(FolderPermissionEntity.ROLE) }
          }]
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

module.exports = FolderPermissionEntity;
