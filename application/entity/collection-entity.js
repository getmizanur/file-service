/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class CollectionEntity extends AbstractEntity {
  static schema = {
    collection_id: null,
    tenant_id: null,
    name: null,
    description: null,
    created_by: null,
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
  getCollectionId() { return this.get('collection_id'); }
  getTenantId() { return this.get('tenant_id'); }
  getName() { return this.get('name'); }
  getDescription() { return this.get('description'); }
  getCreatedBy() { return this.get('created_by'); }
  getCreatedDt() { return this.get('created_dt'); }
  getUpdatedDt() { return this.get('updated_dt'); }
  // Setters
  setCollectionId(id) { return this.set('collection_id', id); }
  setTenantId(id) { return this.set('tenant_id', id); }
  setName(name) { return this.set('name', name); }
  setDescription(desc) { return this.set('description', desc); }
  setCreatedBy(id) { return this.set('created_by', id); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  setUpdatedDt(dt) { return this.set('updated_dt', dt); }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'tenant_id': { required: true },
        'name': {
          required: true,
          filters: [{ name: 'StringTrim' }],
          validators: [{ name: 'StringLength', options: { min: 1, max: 255 } }]
        },
        'created_by': { required: true }
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
module.exports = CollectionEntity;
