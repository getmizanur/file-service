const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FileEventEntity;
beforeAll(() => {
  FileEventEntity = require(globalThis.applicationPath('/application/entity/file-event-entity'));
});

describe('FileEventEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new FileEventEntity();
      expect(entity.getEventId()).toBeNull();
      expect(entity.getFileId()).toBeNull();
      expect(entity.getEventType()).toBeNull();
      expect(entity.getDetail()).toEqual({});
      expect(entity.getActorUserId()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        event_id: 'evt-1',
        file_id: 'file-1',
        event_type: 'UPLOADED',
        detail: { size: 1024 },
        actor_user_id: 'user-1',
        created_dt: '2025-01-01T00:00:00Z'
      };
      const entity = new FileEventEntity(data);
      expect(entity.getEventId()).toBe('evt-1');
      expect(entity.getFileId()).toBe('file-1');
      expect(entity.getEventType()).toBe('UPLOADED');
      expect(entity.getDetail()).toEqual({ size: 1024 });
      expect(entity.getActorUserId()).toBe('user-1');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new FileEventEntity();
    });

    it('should get/set event_id', () => {
      entity.setEventId('evt-100');
      expect(entity.getEventId()).toBe('evt-100');
    });

    it('should get/set file_id', () => {
      entity.setFileId('f-200');
      expect(entity.getFileId()).toBe('f-200');
    });

    it('should get/set event_type with valid value', () => {
      entity.setEventType('DOWNLOADED');
      expect(entity.getEventType()).toBe('DOWNLOADED');
    });

    it('should throw on invalid event_type', () => {
      expect(() => entity.setEventType('INVALID_TYPE')).toThrow('Invalid event type: INVALID_TYPE');
    });

    it('should get/set detail', () => {
      entity.setDetail({ key: 'value' });
      expect(entity.getDetail()).toEqual({ key: 'value' });
    });

    it('should get/set actor_user_id', () => {
      entity.setActorUserId('u-300');
      expect(entity.getActorUserId()).toBe('u-300');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-06-15T12:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-06-15T12:00:00Z');
    });
  });

  describe('static EVENT_TYPE', () => {
    it('should have UPLOAD_INITIATED', () => {
      expect(FileEventEntity.EVENT_TYPE.UPLOAD_INITIATED).toBe('UPLOAD_INITIATED');
    });

    it('should have UPLOADED', () => {
      expect(FileEventEntity.EVENT_TYPE.UPLOADED).toBe('UPLOADED');
    });

    it('should have UPLOAD_COMPLETED', () => {
      expect(FileEventEntity.EVENT_TYPE.UPLOAD_COMPLETED).toBe('UPLOAD_COMPLETED');
    });

    it('should have ACCESS_GRANTED', () => {
      expect(FileEventEntity.EVENT_TYPE.ACCESS_GRANTED).toBe('ACCESS_GRANTED');
    });

    it('should have DOWNLOADED', () => {
      expect(FileEventEntity.EVENT_TYPE.DOWNLOADED).toBe('DOWNLOADED');
    });

    it('should have VIEWED', () => {
      expect(FileEventEntity.EVENT_TYPE.VIEWED).toBe('VIEWED');
    });

    it('should have DELETED', () => {
      expect(FileEventEntity.EVENT_TYPE.DELETED).toBe('DELETED');
    });

    it('should have RESTORED', () => {
      expect(FileEventEntity.EVENT_TYPE.RESTORED).toBe('RESTORED');
    });

    it('should have GDPR_FLAGGED', () => {
      expect(FileEventEntity.EVENT_TYPE.GDPR_FLAGGED).toBe('GDPR_FLAGGED');
    });

    it('should have RETENTION_EXPIRED', () => {
      expect(FileEventEntity.EVENT_TYPE.RETENTION_EXPIRED).toBe('RETENTION_EXPIRED');
    });

    it('should have METADATA_UPDATED', () => {
      expect(FileEventEntity.EVENT_TYPE.METADATA_UPDATED).toBe('METADATA_UPDATED');
    });

    it('should have DERIVATIVE_CREATED', () => {
      expect(FileEventEntity.EVENT_TYPE.DERIVATIVE_CREATED).toBe('DERIVATIVE_CREATED');
    });

    it('should have RENAMED', () => {
      expect(FileEventEntity.EVENT_TYPE.RENAMED).toBe('RENAMED');
    });

    it('should have MOVED', () => {
      expect(FileEventEntity.EVENT_TYPE.MOVED).toBe('MOVED');
    });

    it('should have PERMISSION_UPDATED', () => {
      expect(FileEventEntity.EVENT_TYPE.PERMISSION_UPDATED).toBe('PERMISSION_UPDATED');
    });

    it('should have CREATED', () => {
      expect(FileEventEntity.EVENT_TYPE.CREATED).toBe('CREATED');
    });

    it('should have exactly 16 event types', () => {
      expect(Object.keys(FileEventEntity.EVENT_TYPE)).toHaveLength(16);
    });
  });

  describe('setEventType validation', () => {
    it('should accept all valid event types', () => {
      const entity = new FileEventEntity();
      Object.values(FileEventEntity.EVENT_TYPE).forEach(type => {
        expect(() => entity.setEventType(type)).not.toThrow();
      });
    });

    it('should reject invalid event types', () => {
      const entity = new FileEventEntity();
      expect(() => entity.setEventType('UNKNOWN')).toThrow('Invalid event type: UNKNOWN');
      expect(() => entity.setEventType('')).toThrow('Invalid event type: ');
      expect(() => entity.setEventType('uploaded')).toThrow('Invalid event type: uploaded');
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(FileEventEntity.schema);
      expect(keys).toEqual([
        'event_id', 'file_id', 'event_type', 'detail', 'actor_user_id', 'created_dt'
      ]);
    });
  });

  describe('validation', () => {
    it('should be valid when file_id and event_type are provided', () => {
      const entity = new FileEventEntity({
        file_id: 'f-1', event_type: 'UPLOADED'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when file_id is missing', () => {
      const entity = new FileEventEntity({
        event_type: 'UPLOADED'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when event_type is missing', () => {
      const entity = new FileEventEntity({
        file_id: 'f-1'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid with an invalid event_type value', () => {
      const entity = new FileEventEntity({
        file_id: 'f-1', event_type: 'INVALID'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when all required fields are missing', () => {
      const entity = new FileEventEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new FileEventEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
