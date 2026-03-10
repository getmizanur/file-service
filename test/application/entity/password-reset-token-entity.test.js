const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let PasswordResetTokenEntity;
beforeAll(() => {
  PasswordResetTokenEntity = require(globalThis.applicationPath('/application/entity/password-reset-token-entity'));
});

describe('PasswordResetTokenEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new PasswordResetTokenEntity();
      expect(entity.getTokenId()).toBeNull();
      expect(entity.getUserId()).toBeNull();
      expect(entity.getTokenHash()).toBeNull();
      expect(entity.getExpiresDt()).toBeNull();
      expect(entity.getUsedDt()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        token_id: 'tok-1',
        user_id: 'u-1',
        token_hash: 'resethash123',
        expires_dt: '2025-12-01T00:00:00Z',
        used_dt: null,
        created_dt: '2025-01-01T00:00:00Z'
      };
      const entity = new PasswordResetTokenEntity(data);
      expect(entity.getTokenId()).toBe('tok-1');
      expect(entity.getUserId()).toBe('u-1');
      expect(entity.getTokenHash()).toBe('resethash123');
      expect(entity.getExpiresDt()).toBe('2025-12-01T00:00:00Z');
      expect(entity.getUsedDt()).toBeNull();
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new PasswordResetTokenEntity();
    });

    it('should get/set token_id', () => {
      entity.setTokenId('tok-100');
      expect(entity.getTokenId()).toBe('tok-100');
    });

    it('should get/set user_id', () => {
      entity.setUserId('u-200');
      expect(entity.getUserId()).toBe('u-200');
    });

    it('should get/set token_hash', () => {
      entity.setTokenHash('newhash');
      expect(entity.getTokenHash()).toBe('newhash');
    });

    it('should get/set expires_dt', () => {
      entity.setExpiresDt('2025-12-01T00:00:00Z');
      expect(entity.getExpiresDt()).toBe('2025-12-01T00:00:00Z');
    });

    it('should get/set used_dt', () => {
      entity.setUsedDt('2025-06-01T00:00:00Z');
      expect(entity.getUsedDt()).toBe('2025-06-01T00:00:00Z');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-01-01T00:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('logic methods', () => {
    describe('isExpired()', () => {
      it('should return falsy when expires_dt is null', () => {
        const entity = new PasswordResetTokenEntity();
        expect(entity.isExpired()).toBeFalsy();
      });

      it('should return true when expires_dt is in the past', () => {
        const past = new Date(Date.now() - 3600000).toISOString();
        const entity = new PasswordResetTokenEntity({ expires_dt: past });
        expect(entity.isExpired()).toBe(true);
      });

      it('should return false when expires_dt is in the future', () => {
        const future = new Date(Date.now() + 3600000).toISOString();
        const entity = new PasswordResetTokenEntity({ expires_dt: future });
        expect(entity.isExpired()).toBe(false);
      });
    });

    describe('isUsed()', () => {
      it('should return false when used_dt is null', () => {
        const entity = new PasswordResetTokenEntity();
        expect(entity.isUsed()).toBe(false);
      });

      it('should return true when used_dt is set', () => {
        const entity = new PasswordResetTokenEntity({ used_dt: '2025-06-01T00:00:00Z' });
        expect(entity.isUsed()).toBe(true);
      });
    });

    describe('isValidToken()', () => {
      it('should return true when not expired and not used', () => {
        const future = new Date(Date.now() + 3600000).toISOString();
        const entity = new PasswordResetTokenEntity({ expires_dt: future });
        expect(entity.isValidToken()).toBe(true);
      });

      it('should return false when expired', () => {
        const past = new Date(Date.now() - 3600000).toISOString();
        const entity = new PasswordResetTokenEntity({ expires_dt: past });
        expect(entity.isValidToken()).toBe(false);
      });

      it('should return false when used', () => {
        const future = new Date(Date.now() + 3600000).toISOString();
        const entity = new PasswordResetTokenEntity({
          expires_dt: future,
          used_dt: '2025-06-01T00:00:00Z'
        });
        expect(entity.isValidToken()).toBe(false);
      });

      it('should return false when both expired and used', () => {
        const past = new Date(Date.now() - 3600000).toISOString();
        const entity = new PasswordResetTokenEntity({
          expires_dt: past,
          used_dt: '2025-01-01T00:00:00Z'
        });
        expect(entity.isValidToken()).toBe(false);
      });
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(PasswordResetTokenEntity.schema);
      expect(keys).toEqual([
        'token_id', 'user_id', 'token_hash', 'expires_dt', 'used_dt', 'created_dt'
      ]);
    });

    it('should have all schema defaults as null', () => {
      Object.values(PasswordResetTokenEntity.schema).forEach(val => {
        expect(val).toBeNull();
      });
    });
  });

  describe('validation', () => {
    it('should be valid when user_id, token_hash, and expires_dt are provided', () => {
      const entity = new PasswordResetTokenEntity({
        user_id: 'u-1',
        token_hash: 'hash123',
        expires_dt: '2025-12-01T00:00:00Z'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when user_id is missing', () => {
      const entity = new PasswordResetTokenEntity({
        token_hash: 'hash123',
        expires_dt: '2025-12-01T00:00:00Z'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when token_hash is missing', () => {
      const entity = new PasswordResetTokenEntity({
        user_id: 'u-1',
        expires_dt: '2025-12-01T00:00:00Z'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when expires_dt is missing', () => {
      const entity = new PasswordResetTokenEntity({
        user_id: 'u-1',
        token_hash: 'hash123'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when all required fields are missing', () => {
      const entity = new PasswordResetTokenEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new PasswordResetTokenEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
