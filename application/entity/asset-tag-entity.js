/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class AssetTagEntity extends AbstractEntity {
  static schema = {
    file_id: null,
    tag_id: null,
    created_dt: null
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getFileId() { return this.get('file_id'); }
  getTagId() { return this.get('tag_id'); }
  getCreatedDt() { return this.get('created_dt'); }
  // Setters
  setFileId(id) { return this.set('file_id', id); }
  setTagId(id) { return this.set('tag_id', id); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'file_id': { required: true },
        'tag_id': { required: true }
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
module.exports = AssetTagEntity;
