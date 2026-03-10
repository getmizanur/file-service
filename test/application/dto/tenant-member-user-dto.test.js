const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let TenantMemberUserDTO;
beforeAll(() => {
  TenantMemberUserDTO = require(path.join(projectRoot, 'application/dto/tenant-member-user-dto'));
});

describe('TenantMemberUserDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new TenantMemberUserDTO();
  });

  it('should set tenant_id via setTenantId', () => {
    dto.setTenantId('tenant-001');
    expect(dto.tenant_id).toBe('tenant-001');
  });

  it('should set user_id via setUserId', () => {
    dto.setUserId('user-001');
    expect(dto.user_id).toBe('user-001');
  });

  it('should set role via setRole', () => {
    dto.setRole('admin');
    expect(dto.role).toBe('admin');
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
});
