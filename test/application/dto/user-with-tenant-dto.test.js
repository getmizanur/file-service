const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let UserWithTenantDTO;
beforeAll(() => {
  UserWithTenantDTO = require(path.join(projectRoot, 'application/dto/user-with-tenant-dto'));
});

describe('UserWithTenantDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new UserWithTenantDTO();
  });

  it('should set user_id via setUserId', () => {
    dto.setUserId('user-001');
    expect(dto.user_id).toBe('user-001');
  });

  it('should set email via setEmail', () => {
    dto.setEmail('user@example.com');
    expect(dto.email).toBe('user@example.com');
  });

  it('should set display_name via setDisplayName', () => {
    dto.setDisplayName('John Doe');
    expect(dto.display_name).toBe('John Doe');
  });

  it('should set tenant_id via setTenantId', () => {
    dto.setTenantId('tenant-001');
    expect(dto.tenant_id).toBe('tenant-001');
  });
});
