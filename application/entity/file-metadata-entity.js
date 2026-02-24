// application/entity/file-metadata-entity.js
/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class FileMetadataEntity extends AbstractEntity {
  static schema = {
    file_id: null,
    folder_id: null,
    tenant_id: null,
    integration_id: null,
    storage_backend_id: null,
    title: null,
    description: null,
    application_ref_id: null,
    document_type: null,
    document_type_id: null,
    object_key: null,
    storage_uri: null,
    original_filename: null,
    content_type: null,
    size_bytes: null,
    checksum_sha256: null,
    retention_days: null,
    expires_at: null,
    gdpr_flag: 'false',
    record_status: 'upload',
    record_sub_status: 'pending',
    request_count: 0,
    visibility: 'private',
    general_access: 'restricted',
    deleted_at: null,
    deleted_by: null,
    created_by: null,
    created_dt: null,
    updated_by: null,
    updated_dt: null,
    public_key: null
  };
  static RECORD_STATUS = {
    UPLOAD: 'upload',
    DELETED: 'deleted'
  };
  static RECORD_SUB_STATUS = {
    UPLOAD: 'upload',
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    DELETED: 'deleted',
    GDPR: 'gdpr',
    RETENTION: 'retention',
    CUSTOMER: 'customer'
  };
  static GDPR_FLAG = {
    FALSE: 'false',
    TRUE: 'true',
    DELETE: 'delete',
    PROTECT: 'protect'
  };
  static VISIBILITY = {
    PRIVATE: 'private',
    PUBLIC: 'public'
  };
  static ACCESS = {
    RESTRICTED: 'restricted',
    ANYONE: 'anyone_with_link'
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getFileId() { return this.get('file_id'); }
  getFolderId() { return this.get('folder_id'); }
  getTenantId() { return this.get('tenant_id'); }
  getIntegrationId() { return this.get('integration_id'); }
  getStorageBackendId() { return this.get('storage_backend_id'); }
  getTitle() { return this.get('title'); }
  getDescription() { return this.get('description'); }
  getApplicationRefId() { return this.get('application_ref_id'); }
  getDocumentType() { return this.get('document_type'); }
  getDocumentTypeId() { return this.get('document_type_id'); }
  getObjectKey() { return this.get('object_key'); }
  getStorageUri() { return this.get('storage_uri'); }
  getOriginalFilename() { return this.get('original_filename'); }
  getContentType() { return this.get('content_type'); }
  getSizeBytes() { return this.get('size_bytes'); }
  getChecksumSha256() { return this.get('checksum_sha256'); }
  getRetentionDays() { return this.get('retention_days'); }
  getExpiresAt() { return this.get('expires_at'); }
  getGdprFlag() { return this.get('gdpr_flag', 'false'); }
  getRecordStatus() { return this.get('record_status', 'upload'); }
  getRecordSubStatus() { return this.get('record_sub_status', 'pending'); }
  getRequestCount() { return this.get('request_count', 0); }
  getVisibility() { return this.get('visibility', 'private'); }
  getGeneralAccess() { return this.get('general_access', 'restricted'); }
  getDeletedAt() { return this.get('deleted_at'); }
  getDeletedBy() { return this.get('deleted_by'); }
  getCreatedBy() { return this.get('created_by'); }
  getCreatedDt() { return this.get('created_dt'); }
  getUpdatedBy() { return this.get('updated_by'); }
  getUpdatedDt() { return this.get('updated_dt'); }
  // Setters
  setFileId(id) { return this.set('file_id', id); }
  setFolderId(id) { return this.set('folder_id', id); }
  setTenantId(id) { return this.set('tenant_id', id); }
  setIntegrationId(id) { return this.set('integration_id', id); }
  setStorageBackendId(id) { return this.set('storage_backend_id', id); }
  setTitle(title) { return this.set('title', title); }
  setDescription(val) { return this.set('description', val); }
  setApplicationRefId(val) { return this.set('application_ref_id', val); }
  setDocumentType(val) { return this.set('document_type', val); }
  setDocumentTypeId(val) { return this.set('document_type_id', val); }
  setObjectKey(key) { return this.set('object_key', key); }
  setStorageUri(uri) { return this.set('storage_uri', uri); }
  setOriginalFilename(name) { return this.set('original_filename', name); }
  setContentType(type) { return this.set('content_type', type); }
  setSizeBytes(size) { return this.set('size_bytes', size); }
  setChecksumSha256(sum) { return this.set('checksum_sha256', sum); }
  setRetentionDays(days) { return this.set('retention_days', days); }
  setExpiresAt(dt) { return this.set('expires_at', dt); }
  setRecordStatus(status) {
    if (!Object.values(FileMetadataEntity.RECORD_STATUS).includes(status)) {
      throw new Error(`Invalid record_status: ${status}`);
    }
    return this.set('record_status', status);
  }
  setRecordSubStatus(status) {
    if (!Object.values(FileMetadataEntity.RECORD_SUB_STATUS).includes(status)) {
      throw new Error(`Invalid record_sub_status: ${status}`);
    }
    return this.set('record_sub_status', status);
  }
  setGdprFlag(flag) {
    if (!Object.values(FileMetadataEntity.GDPR_FLAG).includes(flag)) {
      throw new Error(`Invalid gdpr_flag: ${flag}`);
    }
    return this.set('gdpr_flag', flag);
  }
  setRequestCount(count) { return this.set('request_count', count); }
  setVisibility(vis) {
    if (!Object.values(FileMetadataEntity.VISIBILITY).includes(vis)) {
      throw new Error(`Invalid visibility: ${vis}`);
    }
    return this.set('visibility', vis);
  }
  setGeneralAccess(access) {
    if (!Object.values(FileMetadataEntity.ACCESS).includes(access)) {
      throw new Error(`Invalid access: ${access}`);
    }
    return this.set('general_access', access);
  }
  setDeletedAt(dt) { return this.set('deleted_at', dt); }
  setDeletedBy(id) { return this.set('deleted_by', id); }
  setCreatedBy(id) { return this.set('created_by', id); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  setUpdatedBy(id) { return this.set('updated_by', id); }
  setUpdatedDt(dt) { return this.set('updated_dt', dt); }
  // Logic
  isDeleted() { return this.getDeletedAt() !== null; }
  isUploaded() { return this.getRecordStatus() === FileMetadataEntity.RECORD_STATUS.UPLOAD; }
  isCompleted() { return this.getRecordSubStatus() === FileMetadataEntity.RECORD_SUB_STATUS.COMPLETED; }
  isPublic() { return this.getVisibility() === FileMetadataEntity.VISIBILITY.PUBLIC; }

  getPublicKey() { return this.get('public_key'); }
  setPublicKey(key) { return this.set('public_key', key); }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'tenant_id': { required: true },
        'storage_backend_id': { required: true },
        'record_status': {
          required: true,
          validators: [{ name: 'InArray', options: { haystack: Object.values(FileMetadataEntity.RECORD_STATUS) } }]
        },
        'visibility': {
          required: true,
          validators: [{ name: 'InArray', options: { haystack: Object.values(FileMetadataEntity.VISIBILITY) } }]
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
module.exports = FileMetadataEntity;
