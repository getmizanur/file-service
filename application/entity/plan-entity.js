/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class PlanEntity extends AbstractEntity {
  static schema = {
    plan_id: null,
    code: null,
    name: null,
    monthly_price_pence: 0,
    max_upload_size_bytes: null,
    max_assets_count: null,
    max_collections_count: null,
    included_storage_bytes: 0,
    included_egress_bytes: 0,
    can_share_links: true,
    can_derivatives: true,
    can_video_transcode: false,
    can_ai_indexing: false,
    created_dt: null
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getPlanId() { return this.get('plan_id'); }
  getCode() { return this.get('code'); }
  getName() { return this.get('name'); }
  getMonthlyPricePence() { return this.get('monthly_price_pence', 0); }
  getMaxUploadSizeBytes() { return this.get('max_upload_size_bytes'); }
  getMaxAssetsCount() { return this.get('max_assets_count'); }
  getMaxCollectionsCount() { return this.get('max_collections_count'); }
  getIncludedStorageBytes() { return this.get('included_storage_bytes', 0); }
  getIncludedEgressBytes() { return this.get('included_egress_bytes', 0); }
  getCanShareLinks() { return this.get('can_share_links', true); }
  getCanDerivatives() { return this.get('can_derivatives', true); }
  getCanVideoTranscode() { return this.get('can_video_transcode', false); }
  getCanAiIndexing() { return this.get('can_ai_indexing', false); }
  getCreatedDt() { return this.get('created_dt'); }
  // Setters
  setPlanId(id) { return this.set('plan_id', id); }
  setCode(code) { return this.set('code', code); }
  setName(name) { return this.set('name', name); }
  setMonthlyPricePence(price) { return this.set('monthly_price_pence', price); }
  setMaxUploadSizeBytes(size) { return this.set('max_upload_size_bytes', size); }
  setMaxAssetsCount(count) { return this.set('max_assets_count', count); }
  setMaxCollectionsCount(count) { return this.set('max_collections_count', count); }
  setIncludedStorageBytes(bytes) { return this.set('included_storage_bytes', bytes); }
  setIncludedEgressBytes(bytes) { return this.set('included_egress_bytes', bytes); }
  setCanShareLinks(can) { return this.set('can_share_links', can); }
  setCanDerivatives(can) { return this.set('can_derivatives', can); }
  setCanVideoTranscode(can) { return this.set('can_video_transcode', can); }
  setCanAiIndexing(can) { return this.set('can_ai_indexing', can); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  // Logic
  isFree() { return this.getMonthlyPricePence() === 0; }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'code': {
          required: true,
          filters: [{ name: 'StringTrim' }],
          validators: [{ name: 'StringLength', options: { min: 1, max: 255 } }]
        },
        'name': {
          required: true,
          filters: [{ name: 'StringTrim' }],
          validators: [{ name: 'StringLength', options: { min: 1, max: 255 } }]
        },
        'monthly_price_pence': {
          required: true,
          validators: [{ name: 'Digits' }]
        },
        'max_upload_size_bytes': {
          required: true,
          validators: [{ name: 'Digits' }]
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
module.exports = PlanEntity;
