const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FolderStarWithFolderDTO;
beforeAll(() => {
  FolderStarWithFolderDTO = require(path.join(projectRoot, 'application/dto/folder-star-with-folder-dto'));
});

describe('FolderStarWithFolderDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new FolderStarWithFolderDTO();
  });

  it('should set folder_id via setFolderId', () => {
    dto.setFolderId('folder-001');
    expect(dto.folder_id).toBe('folder-001');
  });

  it('should set name via setName', () => {
    dto.setName('My Folder');
    expect(dto.name).toBe('My Folder');
  });

  it('should set owner via setOwner', () => {
    dto.setOwner('user-001');
    expect(dto.owner).toBe('user-001');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set updated_dt via setUpdatedDt', () => {
    dto.setUpdatedDt('2025-02-01T00:00:00Z');
    expect(dto.updated_dt).toBe('2025-02-01T00:00:00Z');
  });

  it('should set starred_dt via setStarredDt', () => {
    dto.setStarredDt('2025-01-15T00:00:00Z');
    expect(dto.starred_dt).toBe('2025-01-15T00:00:00Z');
  });
});
