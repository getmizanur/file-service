// application/entity/tag-entity.js
/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class TagEntity extends AbstractEntity {
  static schema = {
    tag_id: null,
    tenant_id: null,
    name: null,
    created_dt: null
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getTagId() { return this.get('tag_id'); }
  getTenantId() { return this.get('tenant_id'); }
  getName() { return this.get('name'); }
  getCreatedDt() { return this.get('created_dt'); }
  // Setters
  setTagId(id) { return this.set('tag_id', id); }
  setTenantId(id) { return this.set('tenant_id', id); }
  setName(name) { return this.set('name', name); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'tenant_id': { required: true },
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
module.exports = TagEntity;
