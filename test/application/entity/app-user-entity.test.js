const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let AppUserEntity;
beforeAll(() => {
  AppUserEntity = require(globalThis.applicationPath('/application/entity/app-user-entity'));
});

describe('AppUserEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data and have defaults', () => {
      const entity = new AppUserEntity();
      expect(entity.getUserId()).toBeNull();
      expect(entity.getEmail()).toBeNull();
      expect(entity.getDisplayName()).toBeNull();
      expect(entity.getStatus()).toBe('active');
      expect(entity.getEmailVerified()).toBe(false);
      expect(entity.getCreatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        user_id: 'user-1',
        email: 'test@example.com',
        display_name: 'Test User',
        status: 'active',
        email_verified: true,
        created_dt: '2025-01-01T00:00:00Z'
      };
      const entity = new AppUserEntity(data);
      expect(entity.getUserId()).toBe('user-1');
      expect(entity.getEmail()).toBe('test@example.com');
      expect(entity.getDisplayName()).toBe('Test User');
      expect(entity.getStatus()).toBe('active');
      expect(entity.getEmailVerified()).toBe(true);
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('static constants', () => {
    it('should have correct STATUS values', () => {
      expect(AppUserEntity.STATUS).toEqual({
        ACTIVE: 'active',
        INVITED: 'invited',
        DISABLED: 'disabled'
      });
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new AppUserEntity();
    });

    it('should get/set user_id', () => {
      entity.setUserId('u-100');
      expect(entity.getUserId()).toBe('u-100');
    });

    it('should get/set email', () => {
      entity.setEmail('user@example.com');
      expect(entity.getEmail()).toBe('user@example.com');
    });

    it('should get/set display_name', () => {
      entity.setDisplayName('John Doe');
      expect(entity.getDisplayName()).toBe('John Doe');
    });

    it('should get/set status with valid value', () => {
      entity.setStatus('invited');
      expect(entity.getStatus()).toBe('invited');
    });

    it('should get/set email_verified', () => {
      entity.setEmailVerified(true);
      expect(entity.getEmailVerified()).toBe(true);
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-06-15T12:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-06-15T12:00:00Z');
    });
  });

  describe('enum-validating setters', () => {
    let entity;
    beforeEach(() => {
      entity = new AppUserEntity();
    });

    it('should set all valid status values', () => {
      entity.setStatus('active');
      expect(entity.getStatus()).toBe('active');
      entity.setStatus('invited');
      expect(entity.getStatus()).toBe('invited');
      entity.setStatus('disabled');
      expect(entity.getStatus()).toBe('disabled');
    });

    it('should throw on invalid status', () => {
      expect(() => entity.setStatus('banned')).toThrow('Invalid status: banned');
    });

    it('should throw on empty string status', () => {
      expect(() => entity.setStatus('')).toThrow('Invalid status: ');
    });
  });

  describe('logic methods', () => {
    it('isActive() should return true when status is active', () => {
      const entity = new AppUserEntity();
      expect(entity.isActive()).toBe(true);
    });

    it('isActive() should return false when status is not active', () => {
      const entity = new AppUserEntity({ status: 'disabled' });
      expect(entity.isActive()).toBe(false);
    });

    it('isVerified() should return false by default', () => {
      const entity = new AppUserEntity();
      expect(entity.isVerified()).toBe(false);
    });

    it('isVerified() should return true when email_verified is true', () => {
      const entity = new AppUserEntity({ email_verified: true });
      expect(entity.isVerified()).toBe(true);
    });

    it('isVerified() should return false when email_verified is false', () => {
      const entity = new AppUserEntity({ email_verified: false });
      expect(entity.isVerified()).toBe(false);
    });
  });

  describe('validation', () => {
    it('should be valid with email and status', () => {
      const entity = new AppUserEntity({
        email: 'test@example.com',
        status: 'active'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when email is missing', () => {
      const entity = new AppUserEntity({
        status: 'active'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when status is missing', () => {
      const entity = new AppUserEntity({
        email: 'test@example.com',
        status: null
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid with an invalid email', () => {
      const entity = new AppUserEntity({
        email: 'not-an-email',
        status: 'active'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid with an invalid status value', () => {
      const entity = new AppUserEntity({
        email: 'test@example.com',
        status: 'banned'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid with no data', () => {
      const entity = new AppUserEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new AppUserEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
