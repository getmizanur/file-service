// application/entity/tenant-entity.js
/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class TenantEntity extends AbstractEntity {
  static schema = {
    tenant_id: null,
    slug: null,
    name: null,
    status: 'active',
    created_dt: null
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getTenantId() { return this.get('tenant_id'); }
  getSlug() { return this.get('slug'); }
  getName() { return this.get('name'); }
  getStatus() { return this.get('status', 'active'); }
  getCreatedDt() { return this.get('created_dt'); }
  // Setters
  setTenantId(id) { return this.set('tenant_id', id); }
  setSlug(slug) { return this.set('slug', slug); }
  setName(name) { return this.set('name', name); }
  setStatus(status) { return this.set('status', status); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  // Logic
  isActive() { return this.getStatus() === 'active'; }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'slug': {
          required: true,
          filters: [{ name: 'StringTrim' }],
          validators: [{ name: 'StringLength', options: { min: 1, max: 255 } }]
        },
        'name': {
          required: true,
          filters: [{ name: 'StringTrim' }],
          validators: [{ name: 'StringLength', options: { min: 1, max: 255 } }]
        },
        'status': {
          required: true,
          validators: [{ name: 'InArray', options: { haystack: ['active', 'inactive'] } }]
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
module.exports = TenantEntity;
