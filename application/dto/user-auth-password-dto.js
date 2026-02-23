// application/dto/user-auth-password-dto.js
class UserAuthPasswordDTO {
  setUserId(v) { this.user_id = v; }
  setPasswordAlgo(v) { this.password_algo = v; }
  setPasswordUpdatedDt(v) { this.password_updated_dt = v; }
  setFailedAttempts(v) { this.failed_attempts = v; }
  setLockedUntil(v) { this.locked_until = v; }
  setLastLoginDt(v) { this.last_login_dt = v; }
  setCreatedDt(v) { this.created_dt = v; }

  isLocked() {
    return this.locked_until && new Date(this.locked_until) > new Date();
  }
}

module.exports = UserAuthPasswordDTO;