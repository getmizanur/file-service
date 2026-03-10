const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let UserAuthPasswordEntity;
beforeAll(() => {
  UserAuthPasswordEntity = require(globalThis.applicationPath('/application/entity/user-auth-password-entity'));
});

describe('UserAuthPasswordEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new UserAuthPasswordEntity();
      expect(entity.getUserId()).toBeNull();
      expect(entity.getPasswordHash()).toBeNull();
      expect(entity.getPasswordAlgo()).toBe('argon2id');
      expect(entity.getPasswordUpdatedDt()).toBeNull();
      expect(entity.getFailedAttempts()).toBe(0);
      expect(entity.getLockedUntil()).toBeNull();
      expect(entity.getLastLoginDt()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        user_id: 'u-1',
        password_hash: '$argon2id$hash',
        password_algo: 'argon2id',
        password_updated_dt: '2025-01-01T00:00:00Z',
        failed_attempts: 3,
        locked_until: '2025-01-02T00:00:00Z',
        last_login_dt: '2025-01-01T12:00:00Z',
        created_dt: '2024-12-01T00:00:00Z'
      };
      const entity = new UserAuthPasswordEntity(data);
      expect(entity.getUserId()).toBe('u-1');
      expect(entity.getPasswordHash()).toBe('$argon2id$hash');
      expect(entity.getPasswordAlgo()).toBe('argon2id');
      expect(entity.getPasswordUpdatedDt()).toBe('2025-01-01T00:00:00Z');
      expect(entity.getFailedAttempts()).toBe(3);
      expect(entity.getLockedUntil()).toBe('2025-01-02T00:00:00Z');
      expect(entity.getLastLoginDt()).toBe('2025-01-01T12:00:00Z');
      expect(entity.getCreatedDt()).toBe('2024-12-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new UserAuthPasswordEntity();
    });

    it('should get/set user_id', () => {
      entity.setUserId('u-100');
      expect(entity.getUserId()).toBe('u-100');
    });

    it('should get/set password_hash', () => {
      entity.setPasswordHash('newhash');
      expect(entity.getPasswordHash()).toBe('newhash');
    });

    it('should get/set password_algo', () => {
      entity.setPasswordAlgo('bcrypt');
      expect(entity.getPasswordAlgo()).toBe('bcrypt');
    });

    it('should get/set password_updated_dt', () => {
      entity.setPasswordUpdatedDt('2025-06-01T00:00:00Z');
      expect(entity.getPasswordUpdatedDt()).toBe('2025-06-01T00:00:00Z');
    });

    it('should get/set failed_attempts', () => {
      entity.setFailedAttempts(5);
      expect(entity.getFailedAttempts()).toBe(5);
    });

    it('should get/set locked_until', () => {
      entity.setLockedUntil('2025-07-01T00:00:00Z');
      expect(entity.getLockedUntil()).toBe('2025-07-01T00:00:00Z');
    });

    it('should get/set last_login_dt', () => {
      entity.setLastLoginDt('2025-05-01T00:00:00Z');
      expect(entity.getLastLoginDt()).toBe('2025-05-01T00:00:00Z');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-01-01T00:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('logic methods', () => {
    describe('isLocked()', () => {
      it('should return false when locked_until is null', () => {
        const entity = new UserAuthPasswordEntity();
        expect(entity.isLocked()).toBeFalsy();
      });

      it('should return true when locked_until is in the future', () => {
        const future = new Date(Date.now() + 3600000).toISOString();
        const entity = new UserAuthPasswordEntity({ locked_until: future });
        expect(entity.isLocked()).toBe(true);
      });

      it('should return false when locked_until is in the past', () => {
        const past = new Date(Date.now() - 3600000).toISOString();
        const entity = new UserAuthPasswordEntity({ locked_until: past });
        expect(entity.isLocked()).toBe(false);
      });
    });

    describe('incrementFailedAttempts()', () => {
      it('should increment failed_attempts by 1', () => {
        const entity = new UserAuthPasswordEntity({ failed_attempts: 2 });
        entity.incrementFailedAttempts();
        expect(entity.getFailedAttempts()).toBe(3);
      });

      it('should increment from default 0 to 1', () => {
        const entity = new UserAuthPasswordEntity();
        entity.incrementFailedAttempts();
        expect(entity.getFailedAttempts()).toBe(1);
      });

      it('should return the entity for chaining', () => {
        const entity = new UserAuthPasswordEntity();
        const result = entity.incrementFailedAttempts();
        expect(result).toBe(entity);
      });
    });

    describe('resetFailedAttempts()', () => {
      it('should set failed_attempts to 0 and locked_until to null', () => {
        const entity = new UserAuthPasswordEntity({
          failed_attempts: 5,
          locked_until: '2025-12-01T00:00:00Z'
        });
        entity.resetFailedAttempts();
        expect(entity.getFailedAttempts()).toBe(0);
        expect(entity.getLockedUntil()).toBeNull();
      });

      it('should work when already at defaults', () => {
        const entity = new UserAuthPasswordEntity();
        entity.resetFailedAttempts();
        expect(entity.getFailedAttempts()).toBe(0);
        expect(entity.getLockedUntil()).toBeNull();
      });
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(UserAuthPasswordEntity.schema);
      expect(keys).toEqual([
        'user_id', 'password_hash', 'password_algo', 'password_updated_dt',
        'failed_attempts', 'locked_until', 'last_login_dt', 'created_dt'
      ]);
    });

    it('should have correct default values', () => {
      expect(UserAuthPasswordEntity.schema.user_id).toBeNull();
      expect(UserAuthPasswordEntity.schema.password_hash).toBeNull();
      expect(UserAuthPasswordEntity.schema.password_algo).toBe('argon2id');
      expect(UserAuthPasswordEntity.schema.password_updated_dt).toBeNull();
      expect(UserAuthPasswordEntity.schema.failed_attempts).toBe(0);
      expect(UserAuthPasswordEntity.schema.locked_until).toBeNull();
      expect(UserAuthPasswordEntity.schema.last_login_dt).toBeNull();
      expect(UserAuthPasswordEntity.schema.created_dt).toBeNull();
    });
  });

  describe('validation', () => {
    it('should be valid when user_id and password_hash are provided', () => {
      const entity = new UserAuthPasswordEntity({
        user_id: 'u-1',
        password_hash: '$argon2id$hash'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when user_id is missing', () => {
      const entity = new UserAuthPasswordEntity({ password_hash: '$argon2id$hash' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when password_hash is missing', () => {
      const entity = new UserAuthPasswordEntity({ user_id: 'u-1' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when all required fields are missing', () => {
      const entity = new UserAuthPasswordEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new UserAuthPasswordEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
