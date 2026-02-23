// application/dto/tenant-list-item-dto.js
class TenantListItemDTO {
  setTenantId(v) { this.tenant_id = v; }
  setName(v) { this.name = v; }
  setSlug(v) { this.slug = v; }
  setStatus(v) { this.status = v; }
  setCreatedDt(v) { this.created_dt = v; }
  setUpdatedDt(v) { this.updated_dt = v; }
}

module.exports = TenantListItemDTO;