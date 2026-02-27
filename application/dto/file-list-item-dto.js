// application/dto/file-list-item-dto.js
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
  setFolderId(v) { this.folder_id = v; }
  setOriginalFilename(v) { this.original_filename = v; }
  setContentType(v) { this.content_type = v; }
  setLocation(v) { this.location = v; }
  setLocationPath(v) { this.location_path = v; }
}
module.exports = FileListItemDTO;