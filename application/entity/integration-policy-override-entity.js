// application/entity/integration-policy-override-entity.js
/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class IntegrationPolicyOverrideEntity extends AbstractEntity {
  static schema = {
    integration_id: null,
    storage_backend_id: null,
    key_template: null,
    presigned_url_ttl_seconds: null,
    retention_days: null,
    av_required: null,
    allowed_mime_types: null,
    default_visibility: null,
    max_upload_size_bytes: null,
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
  getStorageBackendId() { return this.get('storage_backend_id'); }
  getKeyTemplate() { return this.get('key_template'); }
  getPresignedUrlTtlSeconds() { return this.get('presigned_url_ttl_seconds'); }
  getRetentionDays() { return this.get('retention_days'); }
  getAvRequired() { return this.get('av_required'); }
  getAllowedMimeTypes() { return this.get('allowed_mime_types'); }
  getDefaultVisibility() { return this.get('default_visibility'); }
  getMaxUploadSizeBytes() { return this.get('max_upload_size_bytes'); }
  getUpdatedDt() { return this.get('updated_dt'); }
  // Setters
  setIntegrationId(id) { return this.set('integration_id', id); }
  setStorageBackendId(id) { return this.set('storage_backend_id', id); }
  setKeyTemplate(val) { return this.set('key_template', val); }
  setPresignedUrlTtlSeconds(seconds) { return this.set('presigned_url_ttl_seconds', seconds); }
  setRetentionDays(days) { return this.set('retention_days', days); }
  setAvRequired(required) { return this.set('av_required', required); }
  setAllowedMimeTypes(types) { return this.set('allowed_mime_types', types); }
  setDefaultVisibility(visibility) { return this.set('default_visibility', visibility); }
  setMaxUploadSizeBytes(bytes) { return this.set('max_upload_size_bytes', bytes); }
  setUpdatedDt(dt) { return this.set('updated_dt', dt); }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'integration_id': { required: true }
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
module.exports = IntegrationPolicyOverrideEntity;
