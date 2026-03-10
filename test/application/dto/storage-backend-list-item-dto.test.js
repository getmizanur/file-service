const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let StorageBackendListItemDTO;
beforeAll(() => {
  StorageBackendListItemDTO = require(path.join(projectRoot, 'application/dto/storage-backend-list-item-dto'));
});

describe('StorageBackendListItemDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new StorageBackendListItemDTO();
  });

  it('should set storage_backend_id via setStorageBackendId', () => {
    dto.setStorageBackendId('backend-001');
    expect(dto.storage_backend_id).toBe('backend-001');
  });

  it('should set tenant_id via setTenantId', () => {
    dto.setTenantId('tenant-001');
    expect(dto.tenant_id).toBe('tenant-001');
  });

  it('should set name via setName', () => {
    dto.setName('S3 Primary');
    expect(dto.name).toBe('S3 Primary');
  });

  it('should set provider via setProvider', () => {
    dto.setProvider('aws-s3');
    expect(dto.provider).toBe('aws-s3');
  });

  it('should set delivery via setDelivery', () => {
    dto.setDelivery('cdn');
    expect(dto.delivery).toBe('cdn');
  });

  it('should set is_enabled via setIsEnabled', () => {
    dto.setIsEnabled(true);
    expect(dto.is_enabled).toBe(true);
  });

  it('should set is_default_write via setIsDefaultWrite', () => {
    dto.setIsDefaultWrite(true);
    expect(dto.is_default_write).toBe(true);
  });

  it('should set config via setConfig', () => {
    const config = { bucket: 'my-bucket', region: 'us-east-1' };
    dto.setConfig(config);
    expect(dto.config).toBe(config);
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
