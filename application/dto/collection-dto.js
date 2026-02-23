// application/dto/collection-dto.js
class CollectionDTO {
  setCollectionId(v) { this.collection_id = v; }
  setTenantId(v) { this.tenant_id = v; }
  setName(v) { this.name = v; }
  setDescription(v) { this.description = v; }
  setCreatedBy(v) { this.created_by = v; }
  setCreatedDt(v) { this.created_dt = v; }
  setUpdatedDt(v) { this.updated_dt = v; }
  setDeletedAt(v) { this.deleted_at = v; }
  setDeletedBy(v) { this.deleted_by = v; }

  // Joined from app_user
  setCreatorDisplayName(v) { this.creator_display_name = v; }
}

module.exports = CollectionDTO;
