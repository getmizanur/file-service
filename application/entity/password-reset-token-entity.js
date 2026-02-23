// application/entity/password-reset-token-entity.js
/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class PasswordResetTokenEntity extends AbstractEntity {
  static schema = {
    token_id: null,
    user_id: null,
    token_hash: null,
    expires_dt: null,
    used_dt: null,
    created_dt: null
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getTokenId() { return this.get('token_id'); }
  getUserId() { return this.get('user_id'); }
  getTokenHash() { return this.get('token_hash'); }
  getExpiresDt() { return this.get('expires_dt'); }
  getUsedDt() { return this.get('used_dt'); }
  getCreatedDt() { return this.get('created_dt'); }
  // Setters
  setTokenId(id) { return this.set('token_id', id); }
  setUserId(id) { return this.set('user_id', id); }
  setTokenHash(hash) { return this.set('token_hash', hash); }
  setExpiresDt(dt) { return this.set('expires_dt', dt); }
  setUsedDt(dt) { return this.set('used_dt', dt); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  // Logic
  isExpired() {
    return this.getExpiresDt() && new Date(this.getExpiresDt()) < new Date();
  }
  isUsed() {
    return this.getUsedDt() !== null;
  }
  isValidToken() {
    return !this.isExpired() && !this.isUsed();
  }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'user_id': { required: true },
        'token_hash': { required: true },
        'expires_dt': { required: true }
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
module.exports = PasswordResetTokenEntity;
