const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FolderShareLinkEntity;
beforeAll(() => {
  FolderShareLinkEntity = require(globalThis.applicationPath('/application/entity/folder-share-link-entity'));
});

describe('FolderShareLinkEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new FolderShareLinkEntity();
      expect(entity.getShareId()).toBeNull();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getFolderId()).toBeNull();
      expect(entity.getTokenHash()).toBeNull();
      expect(entity.getExpiresDt()).toBeNull();
      expect(entity.getPasswordHash()).toBeNull();
      expect(entity.getCreatedBy()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
      expect(entity.getRevokedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        share_id: 'share-1',
        tenant_id: 'tenant-1',
        folder_id: 'folder-1',
        token_hash: 'abc123hash',
        expires_dt: '2026-12-31T23:59:59Z',
        password_hash: 'pwdhash',
        created_by: 'user-1',
        created_dt: '2026-01-01T00:00:00Z',
        revoked_dt: null
      };
      const entity = new FolderShareLinkEntity(data);
      expect(entity.getShareId()).toBe('share-1');
      expect(entity.getTenantId()).toBe('tenant-1');
      expect(entity.getFolderId()).toBe('folder-1');
      expect(entity.getTokenHash()).toBe('abc123hash');
      expect(entity.getExpiresDt()).toBe('2026-12-31T23:59:59Z');
      expect(entity.getPasswordHash()).toBe('pwdhash');
      expect(entity.getCreatedBy()).toBe('user-1');
      expect(entity.getCreatedDt()).toBe('2026-01-01T00:00:00Z');
      expect(entity.getRevokedDt()).toBeNull();
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new FolderShareLinkEntity();
    });

    it('should get/set share_id', () => {
      entity.setShareId('s-100');
      expect(entity.getShareId()).toBe('s-100');
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-200');
      expect(entity.getTenantId()).toBe('t-200');
    });

    it('should get/set folder_id', () => {
      entity.setFolderId('f-300');
      expect(entity.getFolderId()).toBe('f-300');
    });

    it('should get/set token_hash', () => {
      entity.setTokenHash('hash-val');
      expect(entity.getTokenHash()).toBe('hash-val');
    });

    it('should get/set expires_dt', () => {
      entity.setExpiresDt('2026-06-15T12:00:00Z');
      expect(entity.getExpiresDt()).toBe('2026-06-15T12:00:00Z');
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
      entity.setCreatedDt('2026-01-15T00:00:00Z');
      expect(entity.getCreatedDt()).toBe('2026-01-15T00:00:00Z');
    });

    it('should get/set revoked_dt', () => {
      entity.setRevokedDt('2026-07-01T00:00:00Z');
      expect(entity.getRevokedDt()).toBe('2026-07-01T00:00:00Z');
    });
  });

  describe('logic methods', () => {
    it('isRevoked() should return false when revoked_dt is null', () => {
      const entity = new FolderShareLinkEntity();
      expect(entity.isRevoked()).toBe(false);
    });

    it('isRevoked() should return true when revoked_dt is set', () => {
      const entity = new FolderShareLinkEntity({ revoked_dt: '2026-07-01T00:00:00Z' });
      expect(entity.isRevoked()).toBe(true);
    });

    it('isExpired() should return false when expires_dt is null', () => {
      const entity = new FolderShareLinkEntity();
      expect(entity.isExpired()).toBe(false);
    });

    it('isExpired() should return true when expires_dt is in the past', () => {
      const entity = new FolderShareLinkEntity({ expires_dt: '2020-01-01T00:00:00Z' });
      expect(entity.isExpired()).toBe(true);
    });

    it('isExpired() should return false when expires_dt is in the future', () => {
      const entity = new FolderShareLinkEntity({ expires_dt: '2099-12-31T23:59:59Z' });
      expect(entity.isExpired()).toBe(false);
    });

    it('isActive() should return true when not revoked and not expired', () => {
      const entity = new FolderShareLinkEntity({ expires_dt: '2099-12-31T23:59:59Z' });
      expect(entity.isActive()).toBe(true);
    });

    it('isActive() should return false when revoked', () => {
      const entity = new FolderShareLinkEntity({ revoked_dt: '2026-01-01T00:00:00Z', expires_dt: '2099-12-31T23:59:59Z' });
      expect(entity.isActive()).toBe(false);
    });

    it('isActive() should return false when expired', () => {
      const entity = new FolderShareLinkEntity({ expires_dt: '2020-01-01T00:00:00Z' });
      expect(entity.isActive()).toBe(false);
    });

    it('isPasswordProtected() should return false when password_hash is null', () => {
      const entity = new FolderShareLinkEntity();
      expect(entity.isPasswordProtected()).toBe(false);
    });

    it('isPasswordProtected() should return true when password_hash is set', () => {
      const entity = new FolderShareLinkEntity({ password_hash: 'somehash' });
      expect(entity.isPasswordProtected()).toBe(true);
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(FolderShareLinkEntity.schema);
      expect(keys).toEqual([
        'share_id', 'tenant_id', 'folder_id', 'token_hash',
        'expires_dt', 'password_hash', 'created_by', 'created_dt', 'revoked_dt'
      ]);
    });

    it('should have all schema defaults as null', () => {
      Object.values(FolderShareLinkEntity.schema).forEach(val => {
        expect(val).toBeNull();
      });
    });
  });

  describe('validation', () => {
    it('should be valid when tenant_id, folder_id and token_hash are provided', () => {
      const entity = new FolderShareLinkEntity({ tenant_id: 't-1', folder_id: 'f-1', token_hash: 'hash' });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when tenant_id is missing', () => {
      const entity = new FolderShareLinkEntity({ folder_id: 'f-1', token_hash: 'hash' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when folder_id is missing', () => {
      const entity = new FolderShareLinkEntity({ tenant_id: 't-1', token_hash: 'hash' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when token_hash is missing', () => {
      const entity = new FolderShareLinkEntity({ tenant_id: 't-1', folder_id: 'f-1' });
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new FolderShareLinkEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
