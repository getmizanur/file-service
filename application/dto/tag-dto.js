// application/dto/tag-dto.js
class TagDTO {
  setTagId(v) { this.tag_id = v; }
  setTenantId(v) { this.tenant_id = v; }
  setName(v) { this.name = v; }
  setCreatedDt(v) { this.created_dt = v; }

  // Aggregated from asset_tag
  setAssetCount(v) { this.asset_count = v; }
}

module.exports = TagDTO;
