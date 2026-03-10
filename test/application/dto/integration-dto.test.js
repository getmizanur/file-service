const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let IntegrationDTO;
beforeAll(() => {
  IntegrationDTO = require(path.join(projectRoot, 'application/dto/integration-dto'));
});

describe('IntegrationDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new IntegrationDTO();
  });

  it('should set integration_id via setIntegrationId', () => {
    dto.setIntegrationId('int-001');
    expect(dto.integration_id).toBe('int-001');
  });

  it('should set tenant_id via setTenantId', () => {
    dto.setTenantId('tenant-001');
    expect(dto.tenant_id).toBe('tenant-001');
  });

  it('should set code via setCode', () => {
    dto.setCode('slack');
    expect(dto.code).toBe('slack');
  });

  it('should set name via setName', () => {
    dto.setName('Slack Integration');
    expect(dto.name).toBe('Slack Integration');
  });

  it('should set status via setStatus', () => {
    dto.setStatus('active');
    expect(dto.status).toBe('active');
  });

  it('should set webhook_url via setWebhookUrl', () => {
    dto.setWebhookUrl('https://hooks.example.com/webhook');
    expect(dto.webhook_url).toBe('https://hooks.example.com/webhook');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set updated_dt via setUpdatedDt', () => {
    dto.setUpdatedDt('2025-02-01T00:00:00Z');
    expect(dto.updated_dt).toBe('2025-02-01T00:00:00Z');
  });

  it('should set tenant_name via setTenantName', () => {
    dto.setTenantName('Acme Corp');
    expect(dto.tenant_name).toBe('Acme Corp');
  });
});
