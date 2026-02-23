// application/entity/app-user-entity.js
/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class AppUserEntity extends AbstractEntity {
  static schema = {
    user_id: null,
    email: null,
    display_name: null,
    status: 'active',
    email_verified: false,
    created_dt: null
  };
  static STATUS = {
    ACTIVE: 'active',
    INVITED: 'invited',
    DISABLED: 'disabled'
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getUserId() { return this.get('user_id'); }
  getEmail() { return this.get('email'); }
  getDisplayName() { return this.get('display_name'); }
  getStatus() { return this.get('status', 'active'); }
  getEmailVerified() { return this.get('email_verified', false); }
  getCreatedDt() { return this.get('created_dt'); }
  // Setters
  setUserId(id) { return this.set('user_id', id); }
  setEmail(email) { return this.set('email', email); }
  setDisplayName(name) { return this.set('display_name', name); }
  setStatus(status) {
    if (!Object.values(AppUserEntity.STATUS).includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    return this.set('status', status);
  }
  setEmailVerified(verified) { return this.set('email_verified', verified); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  // Logic
  isActive() { return this.getStatus() === AppUserEntity.STATUS.ACTIVE; }
  isVerified() { return this.getEmailVerified() === true; }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'email': {
          required: true,
          filters: [{ name: 'StringTrim' }, { name: 'StringToLower' }],
          validators: [{ name: 'EmailAddress' }]
        },
        'status': {
          required: true,
          validators: [{ name: 'InArray', options: { haystack: Object.values(AppUserEntity.STATUS) } }]
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
module.exports = AppUserEntity;
