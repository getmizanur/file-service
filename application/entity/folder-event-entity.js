// application/entity/folder-event-entity.js
/* eslint-disable no-unused-vars */
const AbstractEntity = require(global.applicationPath(
  '/library/core/common/abstract-entity'));
const InputFilter = require(global.applicationPath(
  '/library/input-filter/input-filter'));

class FolderEventEntity extends AbstractEntity {
  static schema = {
    event_id: null,
    folder_id: null,
    event_type: null,
    detail: {},
    actor_user_id: null,
    created_dt: null
  };

  static EVENT_TYPE = {
    CREATED: 'CREATED',
    RENAMED: 'RENAMED',
    MOVED: 'MOVED',
    DELETED: 'DELETED',
    RESTORED: 'RESTORED',
    PERMISSION_UPDATED: 'PERMISSION_UPDATED'
  };

  constructor(data) {
    super();
    if (data) {
      this.exchangeObject(data);
    }
  }

  // Getters
  getEventId() { return this.get('event_id'); }
  getFolderId() { return this.get('folder_id'); }
  getEventType() { return this.get('event_type'); }
  getDetail() { return this.get('detail', {}); }
  getActorUserId() { return this.get('actor_user_id'); }
  getCreatedDt() { return this.get('created_dt'); }

  // Setters
  setEventId(id) { return this.set('event_id', id); }
  setFolderId(id) { return this.set('folder_id', id); }
  setEventType(type) {
    if (!Object.values(FolderEventEntity.EVENT_TYPE).includes(type)) {
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
        'folder_id': { required: true },
        'event_type': {
          required: true,
          validators: [{ name: 'InArray', options: { haystack: Object.values(FolderEventEntity.EVENT_TYPE) } }]
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

module.exports = FolderEventEntity;
