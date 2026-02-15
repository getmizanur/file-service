/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class ShareLinkEntity extends AbstractEntity {
  static schema = {
    share_id: null,
    tenant_id: null,
    file_id: null,
    token_hash: null,
    expires_dt: null,
    password_hash: null,
    created_by: null,
    created_dt: null,
    revoked_dt: null,
    role: 'viewer'
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getShareId() { return this.get('share_id'); }
  getTenantId() { return this.get('tenant_id'); }
  getFileId() { return this.get('file_id'); }
  getTokenHash() { return this.get('token_hash'); }
  getExpiresDt() { return this.get('expires_dt'); }
  getPasswordHash() { return this.get('password_hash'); }
  getCreatedBy() { return this.get('created_by'); }
  getCreatedDt() { return this.get('created_dt'); }
  getRevokedDt() { return this.get('revoked_dt'); }
  getRole() { return this.get('role'); }
  // Setters
  setShareId(id) { return this.set('share_id', id); }
  setTenantId(id) { return this.set('tenant_id', id); }
  setFileId(id) { return this.set('file_id', id); }
  setTokenHash(hash) { return this.set('token_hash', hash); }
  setExpiresDt(dt) { return this.set('expires_dt', dt); }
  setPasswordHash(hash) { return this.set('password_hash', hash); }
  setCreatedBy(id) { return this.set('created_by', id); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  setRevokedDt(dt) { return this.set('revoked_dt', dt); }
  setRole(role) { return this.set('role', role); }
  // Logic
  isExpired() {
    return this.getExpiresDt() && new Date(this.getExpiresDt()) < new Date();
  }
  isRevoked() {
    return this.getRevokedDt() !== null;
  }
  isPasswordProtected() {
    return this.getPasswordHash() !== null;
  }
  isValidLink() {
    return !this.isExpired() && !this.isRevoked();
  }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'tenant_id': { required: true },
        'file_id': { required: true },
        'token_hash': { required: true },
        'expires_dt': { required: false },
        'role': { required: false }
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
module.exports = ShareLinkEntity;
