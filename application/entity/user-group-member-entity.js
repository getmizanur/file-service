// application/entity/user-group-member-entity.js
/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class UserGroupMemberEntity extends AbstractEntity {
  static schema = {
    group_id: null,
    user_id: null,
    created_dt: null
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getGroupId() { return this.get('group_id'); }
  getUserId() { return this.get('user_id'); }
  getCreatedDt() { return this.get('created_dt'); }
  // Setters
  setGroupId(id) { return this.set('group_id', id); }
  setUserId(id) { return this.set('user_id', id); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'group_id': { required: true },
        'user_id': { required: true }
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
module.exports = UserGroupMemberEntity;
