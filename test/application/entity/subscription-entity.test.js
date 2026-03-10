const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let SubscriptionEntity;
beforeAll(() => {
  SubscriptionEntity = require(globalThis.applicationPath('/application/entity/subscription-entity'));
});

describe('SubscriptionEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new SubscriptionEntity();
      expect(entity.getSubscriptionId()).toBeNull();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getPlanId()).toBeNull();
      expect(entity.getStatus()).toBeNull();
      expect(entity.getCurrentPeriodStart()).toBeNull();
      expect(entity.getCurrentPeriodEnd()).toBeNull();
      expect(entity.getExternalRef()).toBeNull();
      expect(entity.getCreatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        subscription_id: 'sub-1',
        tenant_id: 'tenant-1',
        plan_id: 'plan-1',
        status: 'active',
        current_period_start: '2025-01-01T00:00:00Z',
        current_period_end: '2025-02-01T00:00:00Z',
        external_ref: 'ext-ref-1',
        created_dt: '2025-01-01T00:00:00Z'
      };
      const entity = new SubscriptionEntity(data);
      expect(entity.getSubscriptionId()).toBe('sub-1');
      expect(entity.getTenantId()).toBe('tenant-1');
      expect(entity.getPlanId()).toBe('plan-1');
      expect(entity.getStatus()).toBe('active');
      expect(entity.getCurrentPeriodStart()).toBe('2025-01-01T00:00:00Z');
      expect(entity.getCurrentPeriodEnd()).toBe('2025-02-01T00:00:00Z');
      expect(entity.getExternalRef()).toBe('ext-ref-1');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('static constants', () => {
    it('should have correct STATUS values', () => {
      expect(SubscriptionEntity.STATUS).toEqual({
        TRIALING: 'trialing',
        ACTIVE: 'active',
        PAST_DUE: 'past_due',
        CANCELED: 'canceled'
      });
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new SubscriptionEntity();
    });

    it('should get/set subscription_id', () => {
      entity.setSubscriptionId('sub-100');
      expect(entity.getSubscriptionId()).toBe('sub-100');
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-200');
      expect(entity.getTenantId()).toBe('t-200');
    });

    it('should get/set plan_id', () => {
      entity.setPlanId('plan-300');
      expect(entity.getPlanId()).toBe('plan-300');
    });

    it('should get/set status with valid value', () => {
      entity.setStatus('active');
      expect(entity.getStatus()).toBe('active');
    });

    it('should get/set current_period_start', () => {
      entity.setCurrentPeriodStart('2025-03-01T00:00:00Z');
      expect(entity.getCurrentPeriodStart()).toBe('2025-03-01T00:00:00Z');
    });

    it('should get/set current_period_end', () => {
      entity.setCurrentPeriodEnd('2025-04-01T00:00:00Z');
      expect(entity.getCurrentPeriodEnd()).toBe('2025-04-01T00:00:00Z');
    });

    it('should get/set external_ref', () => {
      entity.setExternalRef('stripe-sub-123');
      expect(entity.getExternalRef()).toBe('stripe-sub-123');
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-01-01T00:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('enum-validating setters', () => {
    let entity;
    beforeEach(() => {
      entity = new SubscriptionEntity();
    });

    it('should set all valid status values', () => {
      entity.setStatus('trialing');
      expect(entity.getStatus()).toBe('trialing');
      entity.setStatus('active');
      expect(entity.getStatus()).toBe('active');
      entity.setStatus('past_due');
      expect(entity.getStatus()).toBe('past_due');
      entity.setStatus('canceled');
      expect(entity.getStatus()).toBe('canceled');
    });

    it('should throw on invalid status', () => {
      expect(() => entity.setStatus('expired')).toThrow('Invalid status: expired');
    });

    it('should throw on empty string status', () => {
      expect(() => entity.setStatus('')).toThrow('Invalid status: ');
    });
  });

  describe('logic methods', () => {
    it('isActive() should return true when status is active', () => {
      const entity = new SubscriptionEntity({ status: 'active' });
      expect(entity.isActive()).toBe(true);
    });

    it('isActive() should return false when status is not active', () => {
      const entity = new SubscriptionEntity({ status: 'canceled' });
      expect(entity.isActive()).toBe(false);
    });

    it('isActive() should return false with no status set', () => {
      const entity = new SubscriptionEntity();
      expect(entity.isActive()).toBe(false);
    });

    it('isTrialing() should return true when status is trialing', () => {
      const entity = new SubscriptionEntity({ status: 'trialing' });
      expect(entity.isTrialing()).toBe(true);
    });

    it('isTrialing() should return false when status is not trialing', () => {
      const entity = new SubscriptionEntity({ status: 'active' });
      expect(entity.isTrialing()).toBe(false);
    });

    it('isTrialing() should return false with no status set', () => {
      const entity = new SubscriptionEntity();
      expect(entity.isTrialing()).toBe(false);
    });
  });

  describe('validation', () => {
    it('should be valid with all required fields', () => {
      const entity = new SubscriptionEntity({
        tenant_id: 't-1',
        plan_id: 'plan-1',
        status: 'active',
        current_period_start: '2025-01-01T00:00:00Z',
        current_period_end: '2025-02-01T00:00:00Z'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when tenant_id is missing', () => {
      const entity = new SubscriptionEntity({
        plan_id: 'plan-1',
        status: 'active',
        current_period_start: '2025-01-01T00:00:00Z',
        current_period_end: '2025-02-01T00:00:00Z'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when plan_id is missing', () => {
      const entity = new SubscriptionEntity({
        tenant_id: 't-1',
        status: 'active',
        current_period_start: '2025-01-01T00:00:00Z',
        current_period_end: '2025-02-01T00:00:00Z'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when status is missing', () => {
      const entity = new SubscriptionEntity({
        tenant_id: 't-1',
        plan_id: 'plan-1',
        current_period_start: '2025-01-01T00:00:00Z',
        current_period_end: '2025-02-01T00:00:00Z'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when status is not in allowed values', () => {
      const entity = new SubscriptionEntity({
        tenant_id: 't-1',
        plan_id: 'plan-1',
        status: 'expired',
        current_period_start: '2025-01-01T00:00:00Z',
        current_period_end: '2025-02-01T00:00:00Z'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when current_period_start is missing', () => {
      const entity = new SubscriptionEntity({
        tenant_id: 't-1',
        plan_id: 'plan-1',
        status: 'active',
        current_period_end: '2025-02-01T00:00:00Z'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when current_period_end is missing', () => {
      const entity = new SubscriptionEntity({
        tenant_id: 't-1',
        plan_id: 'plan-1',
        status: 'active',
        current_period_start: '2025-01-01T00:00:00Z'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid with no data', () => {
      const entity = new SubscriptionEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new SubscriptionEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
