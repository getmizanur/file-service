const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let UserTenantDTO;
beforeAll(() => {
  UserTenantDTO = require(path.join(projectRoot, 'application/dto/user-tenant-dto'));
});

describe('UserTenantDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new UserTenantDTO();
  });

  it('should set user_id via setUserId', () => {
    dto.setUserId('user-001');
    expect(dto.user_id).toBe('user-001');
  });

  it('should set tenant_id via setTenantId', () => {
    dto.setTenantId('tenant-001');
    expect(dto.tenant_id).toBe('tenant-001');
  });
});
