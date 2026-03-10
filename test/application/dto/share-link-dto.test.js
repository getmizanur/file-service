const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let ShareLinkDTO;
beforeAll(() => {
  ShareLinkDTO = require(path.join(projectRoot, 'application/dto/share-link-dto'));
});

describe('ShareLinkDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new ShareLinkDTO();
  });

  it('should set share_id via setShareId', () => {
    dto.setShareId('share-001');
    expect(dto.share_id).toBe('share-001');
  });

  it('should set tenant_id via setTenantId', () => {
    dto.setTenantId('tenant-001');
    expect(dto.tenant_id).toBe('tenant-001');
  });

  it('should set file_id via setFileId', () => {
    dto.setFileId('file-001');
    expect(dto.file_id).toBe('file-001');
  });

  it('should set token_hash via setTokenHash', () => {
    dto.setTokenHash('hash123');
    expect(dto.token_hash).toBe('hash123');
  });

  it('should set public_key via setPublicKey', () => {
    dto.setPublicKey('pk-abc');
    expect(dto.public_key).toBe('pk-abc');
  });

  it('should set role via setRole', () => {
    dto.setRole('viewer');
    expect(dto.role).toBe('viewer');
  });

  it('should set visibility via setVisibility', () => {
    dto.setVisibility('public');
    expect(dto.visibility).toBe('public');
  });

  it('should set revoked_dt via setRevokedDt', () => {
    dto.setRevokedDt('2025-06-01T00:00:00Z');
    expect(dto.revoked_dt).toBe('2025-06-01T00:00:00Z');
  });

  it('should set expires_at via setExpiresAt', () => {
    dto.setExpiresAt('2025-12-31T23:59:59Z');
    expect(dto.expires_at).toBe('2025-12-31T23:59:59Z');
  });

  it('should set created_by via setCreatedBy', () => {
    dto.setCreatedBy('user-001');
    expect(dto.created_by).toBe('user-001');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set updated_by via setUpdatedBy', () => {
    dto.setUpdatedBy('user-002');
    expect(dto.updated_by).toBe('user-002');
  });

  it('should set updated_dt via setUpdatedDt', () => {
    dto.setUpdatedDt('2025-02-01T00:00:00Z');
    expect(dto.updated_dt).toBe('2025-02-01T00:00:00Z');
  });
});
