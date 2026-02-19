class SharedWithMeFileDTO {
  setId(v) { this.id = v; }
  setName(v) { this.name = v; }
  setOwner(v) { this.owner = v; }
  setLastModified(v) { this.last_modified = v; }
  setSizeBytes(v) { this.size_bytes = v; }
  setItemType(v) { this.item_type = v; }
  setDocumentType(v) { this.document_type = v; }
  setContentType(v) { this.content_type = v; }
  setCreatedDt(v) { this.created_dt = v; }
  setVisibility(v) { this.visibility = v; }
  setMyRole(v) { this.my_role = v; }
  setSharedAt(v) { this.shared_at = v; }
  setSharedBy(v) { this.shared_by = v; }
}
module.exports = SharedWithMeFileDTO;