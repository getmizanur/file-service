class UsageDailyDTO {
  setUsageId(v) { this.usage_id = v; }
  setTenantId(v) { this.tenant_id = v; }
  setDay(v) { this.day = v; }
  setStorageBytes(v) { this.storage_bytes = v; }
  setEgressBytes(v) { this.egress_bytes = v; }
  setUploadsCount(v) { this.uploads_count = v; }
  setDownloadsCount(v) { this.downloads_count = v; }
  setTransformsCount(v) { this.transforms_count = v; }

  // Joined from tenant
  setTenantName(v) { this.tenant_name = v; }
}

module.exports = UsageDailyDTO;
