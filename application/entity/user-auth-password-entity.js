// application/entity/user-auth-password-entity.js
/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class UserAuthPasswordEntity extends AbstractEntity {
  static schema = {
    user_id: null,
    password_hash: null,
    password_algo: 'argon2id',
    password_updated_dt: null,
    failed_attempts: 0,
    locked_until: null,
    last_login_dt: null,
    created_dt: null
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getUserId() { return this.get('user_id'); }
  getPasswordHash() { return this.get('password_hash'); }
  getPasswordAlgo() { return this.get('password_algo', 'argon2id'); }
  getPasswordUpdatedDt() { return this.get('password_updated_dt'); }
  getFailedAttempts() { return this.get('failed_attempts', 0); }
  getLockedUntil() { return this.get('locked_until'); }
  getLastLoginDt() { return this.get('last_login_dt'); }
  getCreatedDt() { return this.get('created_dt'); }
  // Setters
  setUserId(id) { return this.set('user_id', id); }
  setPasswordHash(hash) { return this.set('password_hash', hash); }
  setPasswordAlgo(algo) { return this.set('password_algo', algo); }
  setPasswordUpdatedDt(dt) { return this.set('password_updated_dt', dt); }
  setFailedAttempts(count) { return this.set('failed_attempts', count); }
  setLockedUntil(dt) { return this.set('locked_until', dt); }
  setLastLoginDt(dt) { return this.set('last_login_dt', dt); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  // Logic
  isLocked() {
    return this.getLockedUntil() && new Date(this.getLockedUntil()) > new Date();
  }
  incrementFailedAttempts() {
    this.setFailedAttempts(this.getFailedAttempts() + 1);
    return this;
  }
  resetFailedAttempts() {
    return this.setFailedAttempts(0).setLockedUntil(null);
  }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'user_id': { required: true },
        'password_hash': { required: true }
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
module.exports = UserAuthPasswordEntity;
