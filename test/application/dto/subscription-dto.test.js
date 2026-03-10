const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let SubscriptionDTO;
beforeAll(() => {
  SubscriptionDTO = require(path.join(projectRoot, 'application/dto/subscription-dto'));
});

describe('SubscriptionDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new SubscriptionDTO();
  });

  it('should set subscription_id via setSubscriptionId', () => {
    dto.setSubscriptionId('sub-001');
    expect(dto.subscription_id).toBe('sub-001');
  });

  it('should set tenant_id via setTenantId', () => {
    dto.setTenantId('tenant-001');
    expect(dto.tenant_id).toBe('tenant-001');
  });

  it('should set plan_id via setPlanId', () => {
    dto.setPlanId('plan-001');
    expect(dto.plan_id).toBe('plan-001');
  });

  it('should set status via setStatus', () => {
    dto.setStatus('active');
    expect(dto.status).toBe('active');
  });

  it('should set current_period_start via setCurrentPeriodStart', () => {
    dto.setCurrentPeriodStart('2025-01-01T00:00:00Z');
    expect(dto.current_period_start).toBe('2025-01-01T00:00:00Z');
  });

  it('should set current_period_end via setCurrentPeriodEnd', () => {
    dto.setCurrentPeriodEnd('2025-02-01T00:00:00Z');
    expect(dto.current_period_end).toBe('2025-02-01T00:00:00Z');
  });

  it('should set external_ref via setExternalRef', () => {
    dto.setExternalRef('stripe-sub-123');
    expect(dto.external_ref).toBe('stripe-sub-123');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set tenant_name via setTenantName', () => {
    dto.setTenantName('Acme Corp');
    expect(dto.tenant_name).toBe('Acme Corp');
  });

  it('should set plan_name via setPlanName', () => {
    dto.setPlanName('Pro Plan');
    expect(dto.plan_name).toBe('Pro Plan');
  });

  it('should set plan_code via setPlanCode', () => {
    dto.setPlanCode('pro');
    expect(dto.plan_code).toBe('pro');
  });

  it('should set monthly_price_pence via setMonthlyPricePence', () => {
    dto.setMonthlyPricePence(999);
    expect(dto.monthly_price_pence).toBe(999);
  });
});
