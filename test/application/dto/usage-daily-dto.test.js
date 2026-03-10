const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let UsageDailyDTO;
beforeAll(() => {
  UsageDailyDTO = require(path.join(projectRoot, 'application/dto/usage-daily-dto'));
});

describe('UsageDailyDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new UsageDailyDTO();
  });

  it('should set tenant_id via setTenantId', () => {
    dto.setTenantId('tenant-001');
    expect(dto.tenant_id).toBe('tenant-001');
  });

  it('should set day via setDay', () => {
    dto.setDay('2025-01-15');
    expect(dto.day).toBe('2025-01-15');
  });

  it('should set storage_bytes via setStorageBytes', () => {
    dto.setStorageBytes(1073741824);
    expect(dto.storage_bytes).toBe(1073741824);
  });

  it('should set egress_bytes via setEgressBytes', () => {
    dto.setEgressBytes(536870912);
    expect(dto.egress_bytes).toBe(536870912);
  });

  it('should set uploads_count via setUploadsCount', () => {
    dto.setUploadsCount(150);
    expect(dto.uploads_count).toBe(150);
  });

  it('should set downloads_count via setDownloadsCount', () => {
    dto.setDownloadsCount(300);
    expect(dto.downloads_count).toBe(300);
  });

  it('should set transforms_count via setTransformsCount', () => {
    dto.setTransformsCount(50);
    expect(dto.transforms_count).toBe(50);
  });

  it('should set tenant_name via setTenantName', () => {
    dto.setTenantName('Acme Corp');
    expect(dto.tenant_name).toBe('Acme Corp');
  });
});
