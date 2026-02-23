// application/entity/storage-backend-entity.js
/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class StorageBackendEntity extends AbstractEntity {
  static schema = {
    storage_backend_id: null,
    name: null,
    provider: null,
    delivery: null,
    is_enabled: true,
    config: {},
    created_dt: null,
    updated_dt: null
  };
  static PROVIDER = {
    AWS_S3: 'aws_s3',
    AZURE_BLOB: 'azure_blob',
    GCP_GCS: 'gcp_gcs',
    MINIO_S3: 'minio_s3',
    FILESYSTEM: 'filesystem',
    SFTP: 'sftp',
    LOCAL_FS: 'local_fs'
  };

  static DELIVERY = {
    CLOUDFRONT_SIGNED_URL: 'cloudfront_signed_url',
    CLOUDFRONT_SIGNED_COOKIE: 'cloudfront_signed_cookie',
    AZURE_CDN_TOKEN: 'azure_cdn_token',
    GCP_CDN_SIGNED_URL: 'gcp_cdn_signed_url',
    APP_STREAM: 'app_stream',
    NGINX_SIGNED_URL: 'nginx_signed_url',
    DIRECT: 'direct'
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getStorageBackendId() { return this.get('storage_backend_id'); }
  getName() { return this.get('name'); }
  getProvider() { return this.get('provider'); }
  getDelivery() { return this.get('delivery'); }
  getIsEnabled() { return this.get('is_enabled', true); }
  getConfig() { return this.get('config', {}); }
  getCreatedDt() { return this.get('created_dt'); }
  getUpdatedDt() { return this.get('updated_dt'); }
  // Setters
  setStorageBackendId(id) { return this.set('storage_backend_id', id); }
  setName(name) { return this.set('name', name); }
  setProvider(provider) {
    if (!Object.values(StorageBackendEntity.PROVIDER).includes(provider)) {
      throw new Error(`Invalid provider: ${provider}`);
    }
    return this.set('provider', provider);
  }
  setDelivery(delivery) {
    if (!Object.values(StorageBackendEntity.DELIVERY).includes(delivery)) {
      throw new Error(`Invalid delivery: ${delivery}`);
    }
    return this.set('delivery', delivery);
  }
  setIsEnabled(enabled) { return this.set('is_enabled', enabled); }
  setConfig(config) { return this.set('config', config); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  setUpdatedDt(dt) { return this.set('updated_dt', dt); }
  // Logic
  isEnabled() { return this.getIsEnabled() === true; }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'name': {
          required: true,
          filters: [{ name: 'StringTrim' }],
          validators: [{ name: 'StringLength', options: { min: 1, max: 255 } }]
        },
        'provider': {
          required: true,
          validators: [{ name: 'InArray', options: { haystack: Object.values(StorageBackendEntity.PROVIDER) } }]
        },
        'delivery': {
          required: true,
          validators: [{ name: 'InArray', options: { haystack: Object.values(StorageBackendEntity.DELIVERY) } }]
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
module.exports = StorageBackendEntity;
