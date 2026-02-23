// application/dto/plan-dto.js
class PlanDTO {
  setPlanId(v) { this.plan_id = v; }
  setCode(v) { this.code = v; }
  setName(v) { this.name = v; }
  setMonthlyPricePence(v) { this.monthly_price_pence = v; }
  setMaxUploadSizeBytes(v) { this.max_upload_size_bytes = v; }
  setMaxAssetsCount(v) { this.max_assets_count = v; }
  setMaxCollectionsCount(v) { this.max_collections_count = v; }
  setIncludedStorageBytes(v) { this.included_storage_bytes = v; }
  setIncludedEgressBytes(v) { this.included_egress_bytes = v; }
  setCanShareLinks(v) { this.can_share_links = v; }
  setCanDerivatives(v) { this.can_derivatives = v; }
  setCanVideoTranscode(v) { this.can_video_transcode = v; }
  setCanAiIndexing(v) { this.can_ai_indexing = v; }
  setCreatedDt(v) { this.created_dt = v; }

  // Aggregated from subscription
  setTenantCount(v) { this.tenant_count = v; }
}

module.exports = PlanDTO;
