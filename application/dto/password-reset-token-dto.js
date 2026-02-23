// application/dto/password-reset-token-dto.js
class PasswordResetTokenDTO {
  setTokenId(v) { this.token_id = v; }
  setUserId(v) { this.user_id = v; }
  setExpiresDt(v) { this.expires_dt = v; }
  setUsedDt(v) { this.used_dt = v; }
  setCreatedDt(v) { this.created_dt = v; }

  // Note: token_hash intentionally excluded (sensitive)

  // Joined from app_user
  setUserEmail(v) { this.user_email = v; }
  setUserDisplayName(v) { this.user_display_name = v; }
}

module.exports = PasswordResetTokenDTO;
