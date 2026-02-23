// application/dto/share-link-dto.js
class ShareLinkDTO {
  setShareId(v) { this.share_id = v; }
  setTenantId(v) { this.tenant_id = v; }
  setFileId(v) { this.file_id = v; }

  setTokenHash(v) { this.token_hash = v; }
  setPublicKey(v) { this.public_key = v; }

  setRole(v) { this.role = v; }
  setVisibility(v) { this.visibility = v; }

  setRevokedDt(v) { this.revoked_dt = v; }
  setExpiresAt(v) { this.expires_at = v; }

  setCreatedBy(v) { this.created_by = v; }
  setCreatedDt(v) { this.created_dt = v; }
  setUpdatedBy(v) { this.updated_by = v; }
  setUpdatedDt(v) { this.updated_dt = v; }
}

module.exports = ShareLinkDTO;