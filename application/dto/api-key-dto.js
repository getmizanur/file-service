class ApiKeyDTO {
  setApiKeyId(v) { this.api_key_id = v; }
  setTenantId(v) { this.tenant_id = v; }
  setIntegrationId(v) { this.integration_id = v; }
  setName(v) { this.name = v; }
  setLastUsedDt(v) { this.last_used_dt = v; }
  setCreatedDt(v) { this.created_dt = v; }
  setRevokedDt(v) { this.revoked_dt = v; }

  setIntegrationName(v) { this.integration_name = v; }
}

module.exports = ApiKeyDTO;
