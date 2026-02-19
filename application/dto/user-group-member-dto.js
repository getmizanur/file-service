class UserGroupMemberDTO {
  setGroupId(v) { this.group_id = v; }
  setUserId(v) { this.user_id = v; }
  setCreatedDt(v) { this.created_dt = v; }

  // Joined from app_user
  setUserEmail(v) { this.user_email = v; }
  setUserDisplayName(v) { this.user_display_name = v; }

  // Joined from user_group
  setGroupName(v) { this.group_name = v; }
}

module.exports = UserGroupMemberDTO;
