// application/entity/file-derivative-entity.js
/* eslint-disable no-unused-vars */
const AbstractEntity = require(globalThis.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(globalThis.applicationPath(
  '/library/input-filter/input-filter'));
class FileDerivativeEntity extends AbstractEntity {
  static schema = {
    derivative_id: null,
    file_id: null,
    kind: null,
    spec: {},
    storage_backend_id: null,
    object_key: null,
    storage_uri: null,
    size_bytes: null,
    manifest: null,
    created_dt: null,
    status: 'pending',
    error_detail: null,
    attempts: 0,
    last_attempt_dt: null,
    ready_dt: null,
    processing_started_dt: null,
    updated_dt: null
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getDerivativeId() { return this.get('derivative_id'); }
  getFileId() { return this.get('file_id'); }
  getKind() { return this.get('kind'); }
  getSpec() { return this.get('spec', {}); }
  getStorageBackendId() { return this.get('storage_backend_id'); }
  getObjectKey() { return this.get('object_key'); }
  getStorageUri() { return this.get('storage_uri'); }
  getSizeBytes() { return this.get('size_bytes'); }
  getManifest() { return this.get('manifest'); }
  getCreatedDt() { return this.get('created_dt'); }
  getStatus() { return this.get('status'); }
  getErrorDetail() { return this.get('error_detail'); }
  getAttempts() { return this.get('attempts'); }
  getLastAttemptDt() { return this.get('last_attempt_dt'); }
  getReadyDt() { return this.get('ready_dt'); }
  getProcessingStartedDt() { return this.get('processing_started_dt'); }
  getUpdatedDt() { return this.get('updated_dt'); }
  // Setters
  setDerivativeId(id) { return this.set('derivative_id', id); }
  setFileId(id) { return this.set('file_id', id); }
  setKind(kind) { return this.set('kind', kind); }
  setSpec(spec) { return this.set('spec', spec); }
  setStorageBackendId(id) { return this.set('storage_backend_id', id); }
  setObjectKey(key) { return this.set('object_key', key); }
  setStorageUri(uri) { return this.set('storage_uri', uri); }
  setSizeBytes(size) { return this.set('size_bytes', size); }
  setManifest(v) { return this.set('manifest', v); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  setStatus(v) { return this.set('status', v); }
  setErrorDetail(v) { return this.set('error_detail', v); }
  setAttempts(v) { return this.set('attempts', v); }
  setLastAttemptDt(v) { return this.set('last_attempt_dt', v); }
  setReadyDt(v) { return this.set('ready_dt', v); }
  setProcessingStartedDt(v) { return this.set('processing_started_dt', v); }
  setUpdatedDt(v) { return this.set('updated_dt', v); }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'file_id': { required: true },
        'kind': { required: true },
        'storage_backend_id': { required: true }
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
module.exports = FileDerivativeEntity;
