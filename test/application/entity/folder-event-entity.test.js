const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FolderEventEntity;
beforeAll(() => {
  FolderEventEntity = require(globalThis.applicationPath('/application/entity/folder-event-entity'));
});

describe('FolderEventEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new FolderEventEntity();
      expect(entity.getEventId()).toBeNull();
      expect(entity.getFolderId()).toBeNull();
      expect(entity.getEventType()).toBeNull();
      expect(entity.getDetail()).toEqual({});
      expect(entity.getActorUserId()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        event_id: 'evt-1',
        folder_id: 'folder-1',
        event_type: 'CREATED',
        detail: { old_name: 'A', new_name: 'B' },
        actor_user_id: 'user-1',
        created_dt: '2025-01-01T00:00:00Z'
      };
      const entity = new FolderEventEntity(data);
      expect(entity.getEventId()).toBe('evt-1');
      expect(entity.getFolderId()).toBe('folder-1');
      expect(entity.getEventType()).toBe('CREATED');
      expect(entity.getDetail()).toEqual({ old_name: 'A', new_name: 'B' });
      expect(entity.getActorUserId()).toBe('user-1');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new FolderEventEntity();
    });

    it('should get/set event_id', () => {
      entity.setEventId('evt-100');
      expect(entity.getEventId()).toBe('evt-100');
    });

    it('should get/set folder_id', () => {
      entity.setFolderId('f-200');
      expect(entity.getFolderId()).toBe('f-200');
    });

    it('should get/set event_type with valid value', () => {
      entity.setEventType('RENAMED');
      expect(entity.getEventType()).toBe('RENAMED');
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
    it('should have CREATED', () => {
      expect(FolderEventEntity.EVENT_TYPE.CREATED).toBe('CREATED');
    });

    it('should have RENAMED', () => {
      expect(FolderEventEntity.EVENT_TYPE.RENAMED).toBe('RENAMED');
    });

    it('should have MOVED', () => {
      expect(FolderEventEntity.EVENT_TYPE.MOVED).toBe('MOVED');
    });

    it('should have DELETED', () => {
      expect(FolderEventEntity.EVENT_TYPE.DELETED).toBe('DELETED');
    });

    it('should have RESTORED', () => {
      expect(FolderEventEntity.EVENT_TYPE.RESTORED).toBe('RESTORED');
    });

    it('should have PERMISSION_UPDATED', () => {
      expect(FolderEventEntity.EVENT_TYPE.PERMISSION_UPDATED).toBe('PERMISSION_UPDATED');
    });

    it('should have exactly 6 event types', () => {
      expect(Object.keys(FolderEventEntity.EVENT_TYPE)).toHaveLength(6);
    });
  });

  describe('setEventType validation', () => {
    it('should accept all valid event types', () => {
      const entity = new FolderEventEntity();
      Object.values(FolderEventEntity.EVENT_TYPE).forEach(type => {
        expect(() => entity.setEventType(type)).not.toThrow();
      });
    });

    it('should reject invalid event types', () => {
      const entity = new FolderEventEntity();
      expect(() => entity.setEventType('UNKNOWN')).toThrow('Invalid event type: UNKNOWN');
      expect(() => entity.setEventType('')).toThrow('Invalid event type: ');
      expect(() => entity.setEventType('created')).toThrow('Invalid event type: created');
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(FolderEventEntity.schema);
      expect(keys).toEqual([
        'event_id', 'folder_id', 'event_type', 'detail', 'actor_user_id', 'created_dt'
      ]);
    });
  });

  describe('validation', () => {
    it('should be valid when folder_id and event_type are provided', () => {
      const entity = new FolderEventEntity({
        folder_id: 'f-1', event_type: 'CREATED'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when folder_id is missing', () => {
      const entity = new FolderEventEntity({
        event_type: 'CREATED'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when event_type is missing', () => {
      const entity = new FolderEventEntity({
        folder_id: 'f-1'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid with an invalid event_type value', () => {
      const entity = new FolderEventEntity({
        folder_id: 'f-1', event_type: 'INVALID'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when all required fields are missing', () => {
      const entity = new FolderEventEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new FolderEventEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
