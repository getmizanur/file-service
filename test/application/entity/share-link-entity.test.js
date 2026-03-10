const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let ShareLinkEntity;
beforeAll(() => {
  ShareLinkEntity = require(globalThis.applicationPath('/application/entity/share-link-entity'));
});

describe('ShareLinkEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new ShareLinkEntity();
      expect(entity.getShareId()).toBeNull();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getFileId()).toBeNull();
      expect(entity.getTokenHash()).toBeNull();
      expect(entity.getExpiresDt()).toBeNull();
      expect(entity.getPasswordHash()).toBeNull();
      expect(entity.getCreatedBy()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
      expect(entity.getRevokedDt()).toBeNull();
      expect(entity.getRole()).toBe('viewer');
    });

    it('should create an entity with data', () => {
      const data = {
        share_id: 'share-1',
        tenant_id: 'tenant-1',
        file_id: 'file-1',
        token_hash: 'tokenhash123',
        expires_dt: '2030-01-01T00:00:00Z',
        password_hash: 'passhash456',
        created_by: 'user-1',
        created_dt: '2025-01-01T00:00:00Z',
        revoked_dt: null,
        role: 'editor'
      };
      const entity = new ShareLinkEntity(data);
      expect(entity.getShareId()).toBe('share-1');
      expect(entity.getTenantId()).toBe('tenant-1');
      expect(entity.getFileId()).toBe('file-1');
      expect(entity.getTokenHash()).toBe('tokenhash123');
      expect(entity.getExpiresDt()).toBe('2030-01-01T00:00:00Z');
      expect(entity.getPasswordHash()).toBe('passhash456');
      expect(entity.getCreatedBy()).toBe('user-1');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
      expect(entity.getRevokedDt()).toBeNull();
      expect(entity.getRole()).toBe('editor');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new ShareLinkEntity();
    });

    it('should get/set share_id', () => {
      entity.setShareId('s-100');
      expect(entity.getShareId()).toBe('s-100');
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-200');
      expect(entity.getTenantId()).toBe('t-200');
    });

    it('should get/set file_id', () => {
      entity.setFileId('f-300');
      expect(entity.getFileId()).toBe('f-300');
    });

    it('should get/set token_hash', () => {
      entity.setTokenHash('hash-abc');
      expect(entity.getTokenHash()).toBe('hash-abc');
    });

    it('should get/set expires_dt', () => {
      entity.setExpiresDt('2030-12-31T23:59:59Z');
      expect(entity.getExpiresDt()).toBe('2030-12-31T23:59:59Z');
    });

    it('should get/set password_hash', () => {
      entity.setPasswordHash('pwd-hash');
      expect(entity.getPasswordHash()).toBe('pwd-hash');
    });

    it('should get/set created_by', () => {
      entity.setCreatedBy('user-5');
      expect(entity.getCreatedBy()).toBe('user-5');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-06-15T12:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-06-15T12:00:00Z');
    });

    it('should get/set revoked_dt', () => {
      entity.setRevokedDt('2025-07-01T00:00:00Z');
      expect(entity.getRevokedDt()).toBe('2025-07-01T00:00:00Z');
    });

    it('should get/set role with valid value', () => {
      entity.setRole('editor');
      expect(entity.getRole()).toBe('editor');
    });

    it('should throw on invalid role', () => {
      expect(() => entity.setRole('superadmin')).toThrow('Invalid role: superadmin');
    });
  });

  describe('static ROLE', () => {
    it('should have OWNER', () => {
      expect(ShareLinkEntity.ROLE.OWNER).toBe('owner');
    });

    it('should have EDITOR', () => {
      expect(ShareLinkEntity.ROLE.EDITOR).toBe('editor');
    });

    it('should have COMMENTER', () => {
      expect(ShareLinkEntity.ROLE.COMMENTER).toBe('commenter');
    });

    it('should have VIEWER', () => {
      expect(ShareLinkEntity.ROLE.VIEWER).toBe('viewer');
    });
  });

  describe('logic methods', () => {
    describe('isExpired()', () => {
      it('should return false when expires_dt is null', () => {
        const entity = new ShareLinkEntity();
        expect(entity.isExpired()).toBeFalsy();
      });

      it('should return false when expires_dt is in the future', () => {
        const entity = new ShareLinkEntity({ expires_dt: '2099-01-01T00:00:00Z' });
        expect(entity.isExpired()).toBe(false);
      });

      it('should return true when expires_dt is in the past', () => {
        const entity = new ShareLinkEntity({ expires_dt: '2020-01-01T00:00:00Z' });
        expect(entity.isExpired()).toBe(true);
      });
    });

    describe('isRevoked()', () => {
      it('should return false when revoked_dt is null', () => {
        const entity = new ShareLinkEntity();
        expect(entity.isRevoked()).toBe(false);
      });

      it('should return true when revoked_dt is set', () => {
        const entity = new ShareLinkEntity({ revoked_dt: '2025-07-01T00:00:00Z' });
        expect(entity.isRevoked()).toBe(true);
      });
    });

    describe('isPasswordProtected()', () => {
      it('should return false when password_hash is null', () => {
        const entity = new ShareLinkEntity();
        expect(entity.isPasswordProtected()).toBe(false);
      });

      it('should return true when password_hash is set', () => {
        const entity = new ShareLinkEntity({ password_hash: 'somehash' });
        expect(entity.isPasswordProtected()).toBe(true);
      });
    });

    describe('isValidLink()', () => {
      it('should return true when not expired and not revoked', () => {
        const entity = new ShareLinkEntity({ expires_dt: '2099-01-01T00:00:00Z' });
        expect(entity.isValidLink()).toBe(true);
      });

      it('should return true when expires_dt is null and not revoked', () => {
        const entity = new ShareLinkEntity();
        expect(entity.isValidLink()).toBe(true);
      });

      it('should return false when expired', () => {
        const entity = new ShareLinkEntity({ expires_dt: '2020-01-01T00:00:00Z' });
        expect(entity.isValidLink()).toBe(false);
      });

      it('should return false when revoked', () => {
        const entity = new ShareLinkEntity({
          expires_dt: '2099-01-01T00:00:00Z',
          revoked_dt: '2025-01-01T00:00:00Z'
        });
        expect(entity.isValidLink()).toBe(false);
      });

      it('should return false when both expired and revoked', () => {
        const entity = new ShareLinkEntity({
          expires_dt: '2020-01-01T00:00:00Z',
          revoked_dt: '2025-01-01T00:00:00Z'
        });
        expect(entity.isValidLink()).toBe(false);
      });
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(ShareLinkEntity.schema);
      expect(keys).toEqual([
        'share_id', 'tenant_id', 'file_id', 'token_hash', 'expires_dt',
        'password_hash', 'created_by', 'created_dt', 'revoked_dt', 'role'
      ]);
    });
  });

  describe('validation', () => {
    it('should be valid when tenant_id, file_id, and token_hash are provided', () => {
      const entity = new ShareLinkEntity({
        tenant_id: 't-1', file_id: 'f-1', token_hash: 'hash123'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when tenant_id is missing', () => {
      const entity = new ShareLinkEntity({
        file_id: 'f-1', token_hash: 'hash123'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when file_id is missing', () => {
      const entity = new ShareLinkEntity({
        tenant_id: 't-1', token_hash: 'hash123'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when token_hash is missing', () => {
      const entity = new ShareLinkEntity({
        tenant_id: 't-1', file_id: 'f-1'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when all required fields are missing', () => {
      const entity = new ShareLinkEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new ShareLinkEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
