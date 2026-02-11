/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class UsageDailyEntity extends AbstractEntity {
  static schema = {
    usage_id: null,
    tenant_id: null,
    day: null,
    storage_bytes: 0,
    egress_bytes: 0,
    uploads_count: 0,
    downloads_count: 0,
    transforms_count: 0
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getUsageId() { return this.get('usage_id'); }
  getTenantId() { return this.get('tenant_id'); }
  getDay() { return this.get('day'); }
  getStorageBytes() { return this.get('storage_bytes', 0); }
  getEgressBytes() { return this.get('egress_bytes', 0); }
  getUploadsCount() { return this.get('uploads_count', 0); }
  getDownloadsCount() { return this.get('downloads_count', 0); }
  getTransformsCount() { return this.get('transforms_count', 0); }
  // Setters
  setUsageId(id) { return this.set('usage_id', id); }
  setTenantId(id) { return this.set('tenant_id', id); }
  setDay(day) { return this.set('day', day); }
  setStorageBytes(bytes) { return this.set('storage_bytes', bytes); }
  setEgressBytes(bytes) { return this.set('egress_bytes', bytes); }
  setUploadsCount(count) { return this.set('uploads_count', count); }
  setDownloadsCount(count) { return this.set('downloads_count', count); }
  setTransformsCount(count) { return this.set('transforms_count', count); }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'tenant_id': { required: true },
        'day': { required: true }
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
module.exports = UsageDailyEntity;
