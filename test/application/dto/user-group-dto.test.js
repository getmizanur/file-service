const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let UserGroupDTO;
beforeAll(() => {
  UserGroupDTO = require(path.join(projectRoot, 'application/dto/user-group-dto'));
});

describe('UserGroupDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new UserGroupDTO();
  });

  it('should set group_id via setGroupId', () => {
    dto.setGroupId('group-001');
    expect(dto.group_id).toBe('group-001');
  });

  it('should set tenant_id via setTenantId', () => {
    dto.setTenantId('tenant-001');
    expect(dto.tenant_id).toBe('tenant-001');
  });

  it('should set name via setName', () => {
    dto.setName('Developers');
    expect(dto.name).toBe('Developers');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set member_count via setMemberCount', () => {
    dto.setMemberCount(12);
    expect(dto.member_count).toBe(12);
  });
});
