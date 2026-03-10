const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FolderWithOwnerDTO;
beforeAll(() => {
  FolderWithOwnerDTO = require(path.join(projectRoot, 'application/dto/folder-with-owner-dto'));
});

describe('FolderWithOwnerDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new FolderWithOwnerDTO();
  });

  it('should set folder_id via setFolderId', () => {
    dto.setFolderId('folder-001');
    expect(dto.folder_id).toBe('folder-001');
  });

  it('should set tenant_id via setTenantId', () => {
    dto.setTenantId('tenant-001');
    expect(dto.tenant_id).toBe('tenant-001');
  });

  it('should set parent_folder_id via setParentFolderId', () => {
    dto.setParentFolderId('parent-001');
    expect(dto.parent_folder_id).toBe('parent-001');
  });

  it('should set name via setName', () => {
    dto.setName('Documents');
    expect(dto.name).toBe('Documents');
  });

  it('should set created_by via setCreatedBy', () => {
    dto.setCreatedBy('user-001');
    expect(dto.created_by).toBe('user-001');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set updated_by via setUpdatedBy', () => {
    dto.setUpdatedBy('user-002');
    expect(dto.updated_by).toBe('user-002');
  });

  it('should set updated_dt via setUpdatedDt', () => {
    dto.setUpdatedDt('2025-02-01T00:00:00Z');
    expect(dto.updated_dt).toBe('2025-02-01T00:00:00Z');
  });

  it('should set deleted_at via setDeletedAt', () => {
    dto.setDeletedAt('2025-03-01T00:00:00Z');
    expect(dto.deleted_at).toBe('2025-03-01T00:00:00Z');
  });

  it('should set deleted_by via setDeletedBy', () => {
    dto.setDeletedBy('user-003');
    expect(dto.deleted_by).toBe('user-003');
  });

  it('should set owner via setOwner', () => {
    dto.setOwner('owner-001');
    expect(dto.owner).toBe('owner-001');
  });

  it('should set location via setLocation', () => {
    dto.setLocation('/root/docs');
    expect(dto.location).toBe('/root/docs');
  });

  it('should set location_path via setLocationPath', () => {
    dto.setLocationPath('/root/docs/subfolder');
    expect(dto.location_path).toBe('/root/docs/subfolder');
  });
});
