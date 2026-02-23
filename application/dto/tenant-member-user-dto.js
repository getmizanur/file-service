// application/dto/tenant-member-user-dto.js
class TenantMemberUserDTO {
  setTenantId(v) { this.tenant_id = v; }
  setUserId(v) { this.user_id = v; }
  setRole(v) { this.role = v; }
  setCreatedDt(v) { this.created_dt = v; }

  // joined user fields
  setUserEmail(v) { this.user_email = v; }
  setUserDisplayName(v) { this.user_display_name = v; }
}

module.exports = TenantMemberUserDTO;