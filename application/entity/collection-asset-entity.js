// application/entity/collection-asset-entity.js
/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class CollectionAssetEntity extends AbstractEntity {
  static schema = {
    collection_id: null,
    file_id: null,
    created_dt: null
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getCollectionId() { return this.get('collection_id'); }
  getFileId() { return this.get('file_id'); }
  getCreatedDt() { return this.get('created_dt'); }
  // Setters
  setCollectionId(id) { return this.set('collection_id', id); }
  setFileId(id) { return this.set('file_id', id); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'collection_id': { required: true },
        'file_id': { required: true }
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
module.exports = CollectionAssetEntity;
