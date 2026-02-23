// application/entity/file-derivative-entity.js
/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
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
    created_dt: null
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
  getCreatedDt() { return this.get('created_dt'); }
  // Setters
  setDerivativeId(id) { return this.set('derivative_id', id); }
  setFileId(id) { return this.set('file_id', id); }
  setKind(kind) { return this.set('kind', kind); }
  setSpec(spec) { return this.set('spec', spec); }
  setStorageBackendId(id) { return this.set('storage_backend_id', id); }
  setObjectKey(key) { return this.set('object_key', key); }
  setStorageUri(uri) { return this.set('storage_uri', uri); }
  setSizeBytes(size) { return this.set('size_bytes', size); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
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
