const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let UserAuthPasswordDTO;
beforeAll(() => {
  UserAuthPasswordDTO = require(path.join(projectRoot, 'application/dto/user-auth-password-dto'));
});

describe('UserAuthPasswordDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new UserAuthPasswordDTO();
  });

  it('should set user_id via setUserId', () => {
    dto.setUserId('user-001');
    expect(dto.user_id).toBe('user-001');
  });

  it('should set password_algo via setPasswordAlgo', () => {
    dto.setPasswordAlgo('bcrypt');
    expect(dto.password_algo).toBe('bcrypt');
  });

  it('should set password_updated_dt via setPasswordUpdatedDt', () => {
    dto.setPasswordUpdatedDt('2025-01-01T00:00:00Z');
    expect(dto.password_updated_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set failed_attempts via setFailedAttempts', () => {
    dto.setFailedAttempts(3);
    expect(dto.failed_attempts).toBe(3);
  });

  it('should set locked_until via setLockedUntil', () => {
    dto.setLockedUntil('2025-01-01T01:00:00Z');
    expect(dto.locked_until).toBe('2025-01-01T01:00:00Z');
  });

  it('should set last_login_dt via setLastLoginDt', () => {
    dto.setLastLoginDt('2025-01-15T00:00:00Z');
    expect(dto.last_login_dt).toBe('2025-01-15T00:00:00Z');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should return true from isLocked when locked_until is in the future', () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    dto.setLockedUntil(futureDate);
    expect(dto.isLocked()).toBe(true);
  });

  it('should return false from isLocked when locked_until is in the past', () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString();
    dto.setLockedUntil(pastDate);
    expect(dto.isLocked()).toBe(false);
  });

  it('should return false from isLocked when locked_until is not set', () => {
    expect(dto.isLocked()).toBeFalsy();
  });
});
