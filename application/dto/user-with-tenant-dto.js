// application/dto/user-with-tenant-dto.js
class UserWithTenantDTO {
  setUserId(v) { this.user_id = v; }
  setEmail(v) { this.email = v; }
  setDisplayName(v) { this.display_name = v; }
  setTenantId(v) { this.tenant_id = v; }
}

module.exports = UserWithTenantDTO;
