/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));
class FileEventEntity extends AbstractEntity {
  static schema = {
    event_id: null,
    file_id: null,
    event_type: null,
    detail: {},
    actor_user_id: null,
    created_dt: null
  };
  static EVENT_TYPE = {
    UPLOAD_INITIATED: 'UPLOAD_INITIATED',
    UPLOADED: 'UPLOADED',
    UPLOAD_COMPLETED: 'UPLOAD_COMPLETED',
    ACCESS_GRANTED: 'ACCESS_GRANTED',
    DOWNLOADED: 'DOWNLOADED',
    VIEWED: 'VIEWED',
    DELETED: 'DELETED',
    RESTORED: 'RESTORED',
    GDPR_FLAGGED: 'GDPR_FLAGGED',
    RETENTION_EXPIRED: 'RETENTION_EXPIRED',
    METADATA_UPDATED: 'METADATA_UPDATED',
    DERIVATIVE_CREATED: 'DERIVATIVE_CREATED',
    RENAMED: 'RENAMED',
    MOVED: 'MOVED',
    PERMISSION_UPDATED: 'PERMISSION_UPDATED',
    CREATED: 'CREATED'
  };
  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }
  // Getters
  getEventId() { return this.get('event_id'); }
  getFileId() { return this.get('file_id'); }
  getEventType() { return this.get('event_type'); }
  getDetail() { return this.get('detail', {}); }
  getActorUserId() { return this.get('actor_user_id'); }
  getCreatedDt() { return this.get('created_dt'); }
  // Setters
  setEventId(id) { return this.set('event_id', id); }
  setFileId(id) { return this.set('file_id', id); }
  setEventType(type) {
    if (!Object.values(FileEventEntity.EVENT_TYPE).includes(type)) {
      throw new Error(`Invalid event type: ${type}`);
    }
    return this.set('event_type', type);
  }
  setDetail(detail) { return this.set('detail', detail); }
  setActorUserId(id) { return this.set('actor_user_id', id); }
  setCreatedDt(dt) { return this.set('created_dt', dt); }
  // Validation
  getInputFilter() {
    if (!this.inputFilter) {
      this.inputFilter = InputFilter.factory({
        'file_id': { required: true },
        'event_type': {
          required: true,
          validators: [{ name: 'InArray', options: { haystack: Object.values(FileEventEntity.EVENT_TYPE) } }]
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
module.exports = FileEventEntity;
