// application/dto/folder-star-with-folder-dto.js
class FolderStarWithFolderDTO {
  setFolderId(v) { this.folder_id = v; }
  setName(v) { this.name = v; }
  setOwner(v) { this.owner = v; }
  setCreatedDt(v) { this.created_dt = v; }
  setUpdatedDt(v) { this.updated_dt = v; }
  setStarredDt(v) { this.starred_dt = v; }
}

module.exports = FolderStarWithFolderDTO;
