// application/entity/api-key-entity.js
/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class ApiKeyEntity extends AbstractEntity {
  static schema = {
    api_key_id: null,
    tenant_id: null,
    integration_id: null,
    name: null,
    key_hash: null,
    last_used_dt: null,
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
  getApiKeyId() { return this.get('api_key_id'); }
  getTenantId() { return this.get('tenant_id'); }
  getIntegrationId() { return this.get('integration_id'); }
  getName() { return this.get('name'); }
  getKeyHash() { return this.get('key_hash'); }
  getLastUsedDt() { return this.get('last_used_dt'); }
  getCreatedDt() { return this.get('created_dt'); }
  getRevokedDt() { return this.get('revoked_dt'); }
  // Setters
  setApiKeyId(id) { return this.set('api_key_id', id); }
  setTenantId(id) { return this.set('tenant_id', id); }
  setIntegrationId(id) { return this.set('integration_id', id); }
  setName(name) { return this.set('name', name); }
  setKeyHash(hash) { return this.set('key_hash', hash); }
  setLastUsedDt(dt) { return this.set('last_used_dt', dt); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  setRevokedDt(dt) { return this.set('revoked_dt', dt); }
  // Logic
  isRevoked() {
    return this.getRevokedDt() !== null;
  }
  isValidKey() {
    return !this.isRevoked();
  }
  revoke() {
    return this.setRevokedDt(new Date());
  }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'tenant_id': { required: true },
        'name': {
          required: true,
          filters: [{ name: 'StringTrim' }],
          validators: [{ name: 'StringLength', options: { min: 1, max: 255 } }]
        },
        'key_hash': { required: true }
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
module.exports = ApiKeyEntity;
