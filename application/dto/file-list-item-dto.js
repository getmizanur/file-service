class FileListItemDTO {
  setId(v) { this.id = v; }
  setName(v) { this.name = v; }
  setOwner(v) { this.owner = v; }
  setCreatedBy(v) { this.created_by = v; }
  setLastModified(v) { this.last_modified = v; }
  setSizeBytes(v) { this.size_bytes = v; }
  setItemType(v) { this.item_type = v; }
  setDocumentType(v) { this.document_type = v; }
  setVisibility(v) { this.visibility = v; }
}
module.exports = FileListItemDTO;