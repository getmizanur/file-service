// application/entity/tenant-policy-entity.js
/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class TenantPolicyEntity extends AbstractEntity {
  static schema = {
    tenant_id: null,
    storage_backend_id: null,
    key_template: null,
    presigned_url_ttl_seconds: 900,
    default_retention_days: null,
    av_required: true,
    allowed_mime_types: [],
    default_visibility: 'private',
    webhook_url: null,
    webhook_secret_hash: null,
    updated_dt: null
  };
  static VISIBILITY = {
    PRIVATE: 'private',
    PUBLIC: 'public'
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getTenantId() { return this.get('tenant_id'); }
  getStorageBackendId() { return this.get('storage_backend_id'); }
  getKeyTemplate() { return this.get('key_template'); }
  getPresignedUrlTtlSeconds() { return this.get('presigned_url_ttl_seconds', 900); }
  getDefaultRetentionDays() { return this.get('default_retention_days'); }
  getAvRequired() { return this.get('av_required', true); }
  getAllowedMimeTypes() { return this.get('allowed_mime_types', []); }
  getDefaultVisibility() { return this.get('default_visibility', 'private'); }
  getWebhookUrl() { return this.get('webhook_url'); }
  getWebhookSecretHash() { return this.get('webhook_secret_hash'); }
  getUpdatedDt() { return this.get('updated_dt'); }
  // Setters
  setTenantId(id) { return this.set('tenant_id', id); }
  setStorageBackendId(id) { return this.set('storage_backend_id', id); }
  setKeyTemplate(val) { return this.set('key_template', val); }
  setPresignedUrlTtlSeconds(seconds) { return this.set('presigned_url_ttl_seconds', seconds); }
  setDefaultRetentionDays(days) { return this.set('default_retention_days', days); }
  setAvRequired(required) { return this.set('av_required', required); }
  setAllowedMimeTypes(types) { return this.set('allowed_mime_types', types); }
  setDefaultVisibility(visibility) {
    if (!Object.values(TenantPolicyEntity.VISIBILITY).includes(visibility)) {
      throw new Error(`Invalid visibility: ${visibility}`);
    }
    return this.set('default_visibility', visibility);
  }
  setWebhookUrl(url) { return this.set('webhook_url', url); }
  setWebhookSecretHash(hash) { return this.set('webhook_secret_hash', hash); }
  setUpdatedDt(dt) { return this.set('updated_dt', dt); }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'storage_backend_id': { required: true },
        'key_template': { required: true },
        'presigned_url_ttl_seconds': {
          required: true,
          validators: [{ name: 'Digits' }]
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
module.exports = TenantPolicyEntity;
