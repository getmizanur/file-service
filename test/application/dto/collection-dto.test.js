const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let CollectionDTO;
beforeAll(() => {
  CollectionDTO = require(path.join(projectRoot, 'application/dto/collection-dto'));
});

describe('CollectionDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new CollectionDTO();
  });

  it('should set collection_id via setCollectionId', () => {
    dto.setCollectionId('col-001');
    expect(dto.collection_id).toBe('col-001');
  });

  it('should set tenant_id via setTenantId', () => {
    dto.setTenantId('tenant-001');
    expect(dto.tenant_id).toBe('tenant-001');
  });

  it('should set name via setName', () => {
    dto.setName('My Collection');
    expect(dto.name).toBe('My Collection');
  });

  it('should set description via setDescription', () => {
    dto.setDescription('A collection of files');
    expect(dto.description).toBe('A collection of files');
  });

  it('should set created_by via setCreatedBy', () => {
    dto.setCreatedBy('user-001');
    expect(dto.created_by).toBe('user-001');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
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
    dto.setDeletedBy('user-002');
    expect(dto.deleted_by).toBe('user-002');
  });

  it('should set creator_display_name via setCreatorDisplayName', () => {
    dto.setCreatorDisplayName('John Doe');
    expect(dto.creator_display_name).toBe('John Doe');
  });
});
