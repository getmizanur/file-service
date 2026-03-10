const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let UserGroupMemberDTO;
beforeAll(() => {
  UserGroupMemberDTO = require(path.join(projectRoot, 'application/dto/user-group-member-dto'));
});

describe('UserGroupMemberDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new UserGroupMemberDTO();
  });

  it('should set group_id via setGroupId', () => {
    dto.setGroupId('group-001');
    expect(dto.group_id).toBe('group-001');
  });

  it('should set user_id via setUserId', () => {
    dto.setUserId('user-001');
    expect(dto.user_id).toBe('user-001');
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

  it('should set group_name via setGroupName', () => {
    dto.setGroupName('Developers');
    expect(dto.group_name).toBe('Developers');
  });
});
