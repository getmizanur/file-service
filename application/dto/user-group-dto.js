class UserGroupDTO {
  setGroupId(v) { this.group_id = v; }
  setTenantId(v) { this.tenant_id = v; }
  setName(v) { this.name = v; }
  setCreatedDt(v) { this.created_dt = v; }

  // Aggregated from user_group_member
  setMemberCount(v) { this.member_count = v; }
}

module.exports = UserGroupDTO;
