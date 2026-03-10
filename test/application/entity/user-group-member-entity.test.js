const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let UserGroupMemberEntity;
beforeAll(() => {
  UserGroupMemberEntity = require(globalThis.applicationPath('/application/entity/user-group-member-entity'));
});

describe('UserGroupMemberEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new UserGroupMemberEntity();
      expect(entity.getGroupId()).toBeNull();
      expect(entity.getUserId()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        group_id: 'grp-1',
        user_id: 'u-1',
        created_dt: '2025-01-01T00:00:00Z'
      };
      const entity = new UserGroupMemberEntity(data);
      expect(entity.getGroupId()).toBe('grp-1');
      expect(entity.getUserId()).toBe('u-1');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new UserGroupMemberEntity();
    });

    it('should get/set group_id', () => {
      entity.setGroupId('grp-100');
      expect(entity.getGroupId()).toBe('grp-100');
    });

    it('should get/set user_id', () => {
      entity.setUserId('u-200');
      expect(entity.getUserId()).toBe('u-200');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-06-01T00:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-06-01T00:00:00Z');
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(UserGroupMemberEntity.schema);
      expect(keys).toEqual(['group_id', 'user_id', 'created_dt']);
    });

    it('should have all schema defaults as null', () => {
      Object.values(UserGroupMemberEntity.schema).forEach(val => {
        expect(val).toBeNull();
      });
    });
  });

  describe('validation', () => {
    it('should be valid when group_id and user_id are provided', () => {
      const entity = new UserGroupMemberEntity({ group_id: 'grp-1', user_id: 'u-1' });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when group_id is missing', () => {
      const entity = new UserGroupMemberEntity({ user_id: 'u-1' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when user_id is missing', () => {
      const entity = new UserGroupMemberEntity({ group_id: 'grp-1' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when both required fields are missing', () => {
      const entity = new UserGroupMemberEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new UserGroupMemberEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
