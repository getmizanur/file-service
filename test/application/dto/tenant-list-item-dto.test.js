const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let TenantListItemDTO;
beforeAll(() => {
  TenantListItemDTO = require(path.join(projectRoot, 'application/dto/tenant-list-item-dto'));
});

describe('TenantListItemDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new TenantListItemDTO();
  });

  it('should set tenant_id via setTenantId', () => {
    dto.setTenantId('tenant-001');
    expect(dto.tenant_id).toBe('tenant-001');
  });

  it('should set name via setName', () => {
    dto.setName('Acme Corp');
    expect(dto.name).toBe('Acme Corp');
  });

  it('should set slug via setSlug', () => {
    dto.setSlug('acme-corp');
    expect(dto.slug).toBe('acme-corp');
  });

  it('should set status via setStatus', () => {
    dto.setStatus('active');
    expect(dto.status).toBe('active');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set updated_dt via setUpdatedDt', () => {
    dto.setUpdatedDt('2025-02-01T00:00:00Z');
    expect(dto.updated_dt).toBe('2025-02-01T00:00:00Z');
  });
});
