// application/dto/collection-asset-dto.js
class CollectionAssetDTO {
  setCollectionId(v) { this.collection_id = v; }
  setFileId(v) { this.file_id = v; }
  setCreatedDt(v) { this.created_dt = v; }

  // Joined from collection
  setCollectionName(v) { this.collection_name = v; }

  // Joined from file_metadata
  setOriginalFilename(v) { this.original_filename = v; }
  setRecordStatus(v) { this.record_status = v; }
  setMimeType(v) { this.mime_type = v; }
  setFileSize(v) { this.file_size = v; }
}

module.exports = CollectionAssetDTO;
