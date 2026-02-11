/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class SubscriptionEntity extends AbstractEntity {
  static schema = {
    subscription_id: null,
    tenant_id: null,
    plan_id: null,
    status: null,
    current_period_start: null,
    current_period_end: null,
    external_ref: null,
    created_dt: null
  };
  static STATUS = {
    TRIALING: 'trialing',
    ACTIVE: 'active',
    PAST_DUE: 'past_due',
    CANCELED: 'canceled'
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getSubscriptionId() { return this.get('subscription_id'); }
  getTenantId() { return this.get('tenant_id'); }
  getPlanId() { return this.get('plan_id'); }
  getStatus() { return this.get('status'); }
  getCurrentPeriodStart() { return this.get('current_period_start'); }
  getCurrentPeriodEnd() { return this.get('current_period_end'); }
  getExternalRef() { return this.get('external_ref'); }
  getCreatedDt() { return this.get('created_dt'); }
  // Setters
  setSubscriptionId(id) { return this.set('subscription_id', id); }
  setTenantId(id) { return this.set('tenant_id', id); }
  setPlanId(id) { return this.set('plan_id', id); }
  setStatus(status) {
    if (!Object.values(SubscriptionEntity.STATUS).includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    return this.set('status', status);
  }
  setCurrentPeriodStart(dt) { return this.set('current_period_start', dt); }
  setCurrentPeriodEnd(dt) { return this.set('current_period_end', dt); }
  setExternalRef(ref) { return this.set('external_ref', ref); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  // Logic
  isActive() { return this.getStatus() === SubscriptionEntity.STATUS.ACTIVE; }
  isTrialing() { return this.getStatus() === SubscriptionEntity.STATUS.TRIALING; }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'tenant_id': { required: true },
        'plan_id': { required: true },
        'status': {
          required: true,
          validators: [{ name: 'InArray', options: { haystack: Object.values(SubscriptionEntity.STATUS) } }]
        },
        'current_period_start': { required: true },
        'current_period_end': { required: true }
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
module.exports = SubscriptionEntity;
