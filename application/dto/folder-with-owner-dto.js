class FolderWithOwnerDTO {
  setFolderId(v) { this.folder_id = v; }
  setTenantId(v) { this.tenant_id = v; }
  setParentFolderId(v) { this.parent_folder_id = v; }
  setName(v) { this.name = v; }
  setCreatedBy(v) { this.created_by = v; }
  setCreatedDt(v) { this.created_dt = v; }
  setUpdatedBy(v) { this.updated_by = v; }
  setUpdatedDt(v) { this.updated_dt = v; }
  setDeletedAt(v) { this.deleted_at = v; }
  setDeletedBy(v) { this.deleted_by = v; }
  setOwner(v) { this.owner = v; }
  setLocation(v) { this.location = v; }
  setLocationPath(v) { this.location_path = v; }
}

module.exports = FolderWithOwnerDTO;
