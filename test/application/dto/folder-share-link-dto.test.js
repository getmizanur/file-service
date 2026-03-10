const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FolderShareLinkDTO;
beforeAll(() => {
  FolderShareLinkDTO = require(path.join(projectRoot, 'application/dto/folder-share-link-dto'));
});

describe('FolderShareLinkDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new FolderShareLinkDTO();
  });

  it('should set share_id via setShareId', () => {
    dto.setShareId('share-001');
    expect(dto.share_id).toBe('share-001');
  });

  it('should set tenant_id via setTenantId', () => {
    dto.setTenantId('tenant-001');
    expect(dto.tenant_id).toBe('tenant-001');
  });

  it('should set folder_id via setFolderId', () => {
    dto.setFolderId('folder-001');
    expect(dto.folder_id).toBe('folder-001');
  });

  it('should set token_hash via setTokenHash', () => {
    dto.setTokenHash('abc123hash');
    expect(dto.token_hash).toBe('abc123hash');
  });

  it('should set expires_dt via setExpiresDt', () => {
    dto.setExpiresDt('2025-12-31T23:59:59Z');
    expect(dto.expires_dt).toBe('2025-12-31T23:59:59Z');
  });

  it('should set password_hash via setPasswordHash', () => {
    dto.setPasswordHash('hashed-password');
    expect(dto.password_hash).toBe('hashed-password');
  });

  it('should set created_by via setCreatedBy', () => {
    dto.setCreatedBy('user-001');
    expect(dto.created_by).toBe('user-001');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set revoked_dt via setRevokedDt', () => {
    dto.setRevokedDt('2025-06-01T00:00:00Z');
    expect(dto.revoked_dt).toBe('2025-06-01T00:00:00Z');
  });

  it('should set folder_name via setFolderName', () => {
    dto.setFolderName('Shared Folder');
    expect(dto.folder_name).toBe('Shared Folder');
  });

  it('should set creator_display_name via setCreatorDisplayName', () => {
    dto.setCreatorDisplayName('Jane Doe');
    expect(dto.creator_display_name).toBe('Jane Doe');
  });
});
