const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let ApiKeyDTO;
beforeAll(() => {
  ApiKeyDTO = require(path.join(projectRoot, 'application/dto/api-key-dto'));
});

describe('ApiKeyDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new ApiKeyDTO();
  });

  it('should set api_key_id via setApiKeyId', () => {
    dto.setApiKeyId('key-001');
    expect(dto.api_key_id).toBe('key-001');
  });

  it('should set tenant_id via setTenantId', () => {
    dto.setTenantId('tenant-001');
    expect(dto.tenant_id).toBe('tenant-001');
  });

  it('should set integration_id via setIntegrationId', () => {
    dto.setIntegrationId('int-001');
    expect(dto.integration_id).toBe('int-001');
  });

  it('should set name via setName', () => {
    dto.setName('My API Key');
    expect(dto.name).toBe('My API Key');
  });

  it('should set last_used_dt via setLastUsedDt', () => {
    dto.setLastUsedDt('2025-01-01T00:00:00Z');
    expect(dto.last_used_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set revoked_dt via setRevokedDt', () => {
    dto.setRevokedDt('2025-02-01T00:00:00Z');
    expect(dto.revoked_dt).toBe('2025-02-01T00:00:00Z');
  });

  it('should set integration_name via setIntegrationName', () => {
    dto.setIntegrationName('Slack Integration');
    expect(dto.integration_name).toBe('Slack Integration');
  });
});
