class IntegrationPolicyOverrideDTO {
  setIntegrationId(v) { this.integration_id = v; }
  setStorageBackendId(v) { this.storage_backend_id = v; }
  setKeyTemplate(v) { this.key_template = v; }
  setPresignedUrlTtlSeconds(v) { this.presigned_url_ttl_seconds = v; }
  setRetentionDays(v) { this.retention_days = v; }
  setAvRequired(v) { this.av_required = v; }
  setAllowedMimeTypes(v) { this.allowed_mime_types = v; }
  setDefaultVisibility(v) { this.default_visibility = v; }
  setMaxUploadSizeBytes(v) { this.max_upload_size_bytes = v; }
  setUpdatedDt(v) { this.updated_dt = v; }

  // Joined from integration
  setIntegrationName(v) { this.integration_name = v; }

  // Joined from storage_backend
  setBackendName(v) { this.backend_name = v; }
  setBackendProvider(v) { this.backend_provider = v; }
}

module.exports = IntegrationPolicyOverrideDTO;
