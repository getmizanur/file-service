class IntegrationDTO {
  setIntegrationId(v) { this.integration_id = v; }
  setTenantId(v) { this.tenant_id = v; }
  setCode(v) { this.code = v; }
  setName(v) { this.name = v; }
  setStatus(v) { this.status = v; }
  setWebhookUrl(v) { this.webhook_url = v; }
  setCreatedDt(v) { this.created_dt = v; }
  setUpdatedDt(v) { this.updated_dt = v; }

  // Note: webhook_secret_hash intentionally excluded (sensitive)

  // Joined from tenant
  setTenantName(v) { this.tenant_name = v; }
}

module.exports = IntegrationDTO;
