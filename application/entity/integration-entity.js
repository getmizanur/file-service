/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class IntegrationEntity extends AbstractEntity {
  static STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive'
  };

  static schema = {
    integration_id: null,
    tenant_id: null,
    code: null,
    name: null,
    status: 'active',
    webhook_url: null,
    webhook_secret_hash: null,
    created_dt: null,
    updated_dt: null
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getIntegrationId() { return this.get('integration_id'); }
  getTenantId() { return this.get('tenant_id'); }
  getCode() { return this.get('code'); }
  getName() { return this.get('name'); }
  getStatus() { return this.get('status', 'active'); }
  getWebhookUrl() { return this.get('webhook_url'); }
  getWebhookSecretHash() { return this.get('webhook_secret_hash'); }
  getCreatedDt() { return this.get('created_dt'); }
  getUpdatedDt() { return this.get('updated_dt'); }
  // Setters
  setIntegrationId(id) { return this.set('integration_id', id); }
  setTenantId(id) { return this.set('tenant_id', id); }
  setCode(code) { return this.set('code', code); }
  setName(name) { return this.set('name', name); }
  setStatus(status) {
    if (!Object.values(IntegrationEntity.STATUS).includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    return this.set('status', status);
  }
  setWebhookUrl(url) { return this.set('webhook_url', url); }
  setWebhookSecretHash(hash) { return this.set('webhook_secret_hash', hash); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  setUpdatedDt(dt) { return this.set('updated_dt', dt); }
  // Logic
  isActive() { return this.getStatus() === IntegrationEntity.STATUS.ACTIVE; }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'tenant_id': { required: true },
        'code': {
          required: true,
          filters: [{ name: 'StringTrim' }],
          validators: [{ name: 'StringLength', options: { min: 1, max: 255 } }]
        },
        'name': {
          required: true,
          filters: [{ name: 'StringTrim' }],
          validators: [{ name: 'StringLength', options: { min: 1, max: 255 } }]
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
module.exports = IntegrationEntity;
