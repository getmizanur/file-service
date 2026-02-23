// application/dto/asset-tag-dto.js
class AssetTagDTO {
  setFileId(v) { this.file_id = v; }
  setTagId(v) { this.tag_id = v; }
  setCreatedDt(v) { this.created_dt = v; }

  // Joined fields
  setTagName(v) { this.tag_name = v; }
  setTagSlug(v) { this.tag_slug = v; }
  setOriginalFilename(v) { this.original_filename = v; }
}

module.exports = AssetTagDTO;
