// application/dto/tenant-policy-dto.js
class TenantPolicyDTO {
  setPolicyId(v) { this.policy_id = v; }
  setTenantId(v) { this.tenant_id = v; }

  // Add the policy fields you actually have in tenant_policy:
  // Examples (rename to match your real columns):
  setRetentionDays(v) { this.retention_days = v; }
  setAllowPublicLinks(v) { this.allow_public_links = v; }
  setDefaultVisibility(v) { this.default_visibility = v; }

  setCreatedDt(v) { this.created_dt = v; }
  setUpdatedDt(v) { this.updated_dt = v; }
}

module.exports = TenantPolicyDTO;