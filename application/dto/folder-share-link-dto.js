class FolderShareLinkDTO {
  setShareId(v) { this.share_id = v; }
  setTenantId(v) { this.tenant_id = v; }
  setFolderId(v) { this.folder_id = v; }
  setTokenHash(v) { this.token_hash = v; }
  setExpiresDt(v) { this.expires_dt = v; }
  setPasswordHash(v) { this.password_hash = v; }
  setCreatedBy(v) { this.created_by = v; }
  setCreatedDt(v) { this.created_dt = v; }
  setRevokedDt(v) { this.revoked_dt = v; }

  setFolderName(v) { this.folder_name = v; }
  setCreatorDisplayName(v) { this.creator_display_name = v; }
}

module.exports = FolderShareLinkDTO;
