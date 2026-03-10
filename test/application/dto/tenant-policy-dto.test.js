const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let TenantPolicyDTO;
beforeAll(() => {
  TenantPolicyDTO = require(path.join(projectRoot, 'application/dto/tenant-policy-dto'));
});

describe('TenantPolicyDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new TenantPolicyDTO();
  });

  it('should set policy_id via setPolicyId', () => {
    dto.setPolicyId('policy-001');
    expect(dto.policy_id).toBe('policy-001');
  });

  it('should set tenant_id via setTenantId', () => {
    dto.setTenantId('tenant-001');
    expect(dto.tenant_id).toBe('tenant-001');
  });

  it('should set retention_days via setRetentionDays', () => {
    dto.setRetentionDays(365);
    expect(dto.retention_days).toBe(365);
  });

  it('should set allow_public_links via setAllowPublicLinks', () => {
    dto.setAllowPublicLinks(true);
    expect(dto.allow_public_links).toBe(true);
  });

  it('should set default_visibility via setDefaultVisibility', () => {
    dto.setDefaultVisibility('private');
    expect(dto.default_visibility).toBe('private');
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
