const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FilePermissionUserDTO;
beforeAll(() => {
  FilePermissionUserDTO = require(path.join(projectRoot, 'application/dto/file-permission-user-dto'));
});

describe('FilePermissionUserDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new FilePermissionUserDTO();
  });

  it('should set permission_id via setPermissionId', () => {
    dto.setPermissionId('perm-001');
    expect(dto.permission_id).toBe('perm-001');
  });

  it('should set tenant_id via setTenantId', () => {
    dto.setTenantId('tenant-001');
    expect(dto.tenant_id).toBe('tenant-001');
  });

  it('should set file_id via setFileId', () => {
    dto.setFileId('file-001');
    expect(dto.file_id).toBe('file-001');
  });

  it('should set user_id via setUserId', () => {
    dto.setUserId('user-001');
    expect(dto.user_id).toBe('user-001');
  });

  it('should set role via setRole', () => {
    dto.setRole('editor');
    expect(dto.role).toBe('editor');
  });

  it('should set created_by via setCreatedBy', () => {
    dto.setCreatedBy('user-002');
    expect(dto.created_by).toBe('user-002');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set user_email via setUserEmail', () => {
    dto.setUserEmail('user@example.com');
    expect(dto.user_email).toBe('user@example.com');
  });

  it('should set user_display_name via setUserDisplayName', () => {
    dto.setUserDisplayName('John Doe');
    expect(dto.user_display_name).toBe('John Doe');
  });

  it('should set actor_display_name via setActorDisplayName', () => {
    dto.setActorDisplayName('Jane Doe');
    expect(dto.actor_display_name).toBe('Jane Doe');
  });
});
