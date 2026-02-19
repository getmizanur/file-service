class FilePermissionUserDTO {
  setPermissionId(v) { this.permission_id = v; }
  setTenantId(v) { this.tenant_id = v; }
  setFileId(v) { this.file_id = v; }
  setUserId(v) { this.user_id = v; }

  setRole(v) { this.role = v; }
  setCreatedBy(v) { this.created_by = v; }
  setCreatedDt(v) { this.created_dt = v; }

  setUserEmail(v) { this.user_email = v; }
  setUserDisplayName(v) { this.user_display_name = v; }

  setActorDisplayName(v) { this.actor_display_name = v; }
}

module.exports = FilePermissionUserDTO;