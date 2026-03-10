const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FilePermissionAccessDTO;
beforeAll(() => {
  FilePermissionAccessDTO = require(path.join(projectRoot, 'application/dto/file-permission-access-dto'));
});

describe('FilePermissionAccessDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new FilePermissionAccessDTO();
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

  it('should set role via setRole', () => {
    dto.setRole('editor');
    expect(dto.role).toBe('editor');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });
});
