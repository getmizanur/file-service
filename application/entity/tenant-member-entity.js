/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class TenantMemberEntity extends AbstractEntity {
  static schema = {
    tenant_id: null,
    user_id: null,
    role: 'member',
    created_dt: null
  };
  static ROLE = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
    VIEWER: 'viewer'
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getTenantId() { return this.get('tenant_id'); }
  getUserId() { return this.get('user_id'); }
  getRole() { return this.get('role', 'member'); }
  getCreatedDt() { return this.get('created_dt'); }
  // Setters
  setTenantId(id) { return this.set('tenant_id', id); }
  setUserId(id) { return this.set('user_id', id); }
  setRole(role) {
    if (!Object.values(TenantMemberEntity.ROLE).includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    return this.set('role', role);
  }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  // Logic
  isAdmin() { return ['owner', 'admin'].includes(this.getRole()); }
  isOwner() { return this.getRole() === TenantMemberEntity.ROLE.OWNER; }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'tenant_id': { required: true },
        'user_id': { required: true },
        'role': {
          required: true,
          validators: [{ name: 'InArray', options: { haystack: Object.values(TenantMemberEntity.ROLE) } }]
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
module.exports = TenantMemberEntity;
