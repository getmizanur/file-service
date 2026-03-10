const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FilePermissionRoleDTO;
beforeAll(() => {
  FilePermissionRoleDTO = require(path.join(projectRoot, 'application/dto/file-permission-role-dto'));
});

describe('FilePermissionRoleDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new FilePermissionRoleDTO();
  });

  it('should set role via setRole', () => {
    dto.setRole('viewer');
    expect(dto.role).toBe('viewer');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });
});
