const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let TagDTO;
beforeAll(() => {
  TagDTO = require(path.join(projectRoot, 'application/dto/tag-dto'));
});

describe('TagDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new TagDTO();
  });

  it('should set tag_id via setTagId', () => {
    dto.setTagId('tag-001');
    expect(dto.tag_id).toBe('tag-001');
  });

  it('should set tenant_id via setTenantId', () => {
    dto.setTenantId('tenant-001');
    expect(dto.tenant_id).toBe('tenant-001');
  });

  it('should set name via setName', () => {
    dto.setName('Important');
    expect(dto.name).toBe('Important');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set asset_count via setAssetCount', () => {
    dto.setAssetCount(15);
    expect(dto.asset_count).toBe(15);
  });
});
