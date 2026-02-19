const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));

class FolderShareLinkEntity extends AbstractEntity {
  static schema = {
    share_id: null,
    tenant_id: null,
    folder_id: null,
    token_hash: null,
    expires_dt: null,
    password_hash: null,
    created_by: null,
    created_dt: null,
    revoked_dt: null
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
  getFolderId() { return this.get('folder_id'); }
  getTokenHash() { return this.get('token_hash'); }
  getExpiresDt() { return this.get('expires_dt'); }
  getPasswordHash() { return this.get('password_hash'); }
  getCreatedBy() { return this.get('created_by'); }
  getCreatedDt() { return this.get('created_dt'); }
  getRevokedDt() { return this.get('revoked_dt'); }

  // Setters
  setShareId(id) { return this.set('share_id', id); }
  setTenantId(id) { return this.set('tenant_id', id); }
  setFolderId(id) { return this.set('folder_id', id); }
  setTokenHash(v) { return this.set('token_hash', v); }
  setExpiresDt(dt) { return this.set('expires_dt', dt); }
  setPasswordHash(v) { return this.set('password_hash', v); }
  setCreatedBy(id) { return this.set('created_by', id); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  setRevokedDt(dt) { return this.set('revoked_dt', dt); }

  // Logic
  isRevoked() { return this.getRevokedDt() !== null; }
  isExpired() {
    const expires = this.getExpiresDt();
    return expires ? new Date() > new Date(expires) : false;
  }
  isActive() { return !this.isRevoked() && !this.isExpired(); }
  isPasswordProtected() { return this.getPasswordHash() !== null; }

  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'tenant_id': { required: true },
        'folder_id': { required: true },
        'token_hash': { required: true }
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

module.exports = FolderShareLinkEntity;
