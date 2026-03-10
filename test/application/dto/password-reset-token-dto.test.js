const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let PasswordResetTokenDTO;
beforeAll(() => {
  PasswordResetTokenDTO = require(path.join(projectRoot, 'application/dto/password-reset-token-dto'));
});

describe('PasswordResetTokenDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new PasswordResetTokenDTO();
  });

  it('should set token_id via setTokenId', () => {
    dto.setTokenId('token-001');
    expect(dto.token_id).toBe('token-001');
  });

  it('should set user_id via setUserId', () => {
    dto.setUserId('user-001');
    expect(dto.user_id).toBe('user-001');
  });

  it('should set expires_dt via setExpiresDt', () => {
    dto.setExpiresDt('2025-12-31T23:59:59Z');
    expect(dto.expires_dt).toBe('2025-12-31T23:59:59Z');
  });

  it('should set used_dt via setUsedDt', () => {
    dto.setUsedDt('2025-01-15T00:00:00Z');
    expect(dto.used_dt).toBe('2025-01-15T00:00:00Z');
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
