const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let PlanEntity;
beforeAll(() => {
  PlanEntity = require(globalThis.applicationPath('/application/entity/plan-entity'));
});

describe('PlanEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new PlanEntity();
      expect(entity.getPlanId()).toBeNull();
      expect(entity.getCode()).toBeNull();
      expect(entity.getName()).toBeNull();
      expect(entity.getMonthlyPricePence()).toBe(0);
      expect(entity.getMaxUploadSizeBytes()).toBeNull();
      expect(entity.getMaxAssetsCount()).toBeNull();
      expect(entity.getMaxCollectionsCount()).toBeNull();
      expect(entity.getIncludedStorageBytes()).toBe(0);
      expect(entity.getIncludedEgressBytes()).toBe(0);
      expect(entity.getCanShareLinks()).toBe(true);
      expect(entity.getCanDerivatives()).toBe(true);
      expect(entity.getCanVideoTranscode()).toBe(false);
      expect(entity.getCanAiIndexing()).toBe(false);
      expect(entity.getCreatedDt()).toBeNull();
    });

    it('should create an entity with data', () => {
      const data = {
        plan_id: 'plan-1',
        code: 'pro',
        name: 'Pro Plan',
        monthly_price_pence: 999,
        max_upload_size_bytes: 104857600,
        max_assets_count: 10000,
        max_collections_count: 100,
        included_storage_bytes: 10737418240,
        included_egress_bytes: 5368709120,
        can_share_links: true,
        can_derivatives: true,
        can_video_transcode: true,
        can_ai_indexing: true,
        created_dt: '2025-01-01T00:00:00Z'
      };
      const entity = new PlanEntity(data);
      expect(entity.getPlanId()).toBe('plan-1');
      expect(entity.getCode()).toBe('pro');
      expect(entity.getName()).toBe('Pro Plan');
      expect(entity.getMonthlyPricePence()).toBe(999);
      expect(entity.getMaxUploadSizeBytes()).toBe(104857600);
      expect(entity.getMaxAssetsCount()).toBe(10000);
      expect(entity.getMaxCollectionsCount()).toBe(100);
      expect(entity.getIncludedStorageBytes()).toBe(10737418240);
      expect(entity.getIncludedEgressBytes()).toBe(5368709120);
      expect(entity.getCanShareLinks()).toBe(true);
      expect(entity.getCanDerivatives()).toBe(true);
      expect(entity.getCanVideoTranscode()).toBe(true);
      expect(entity.getCanAiIndexing()).toBe(true);
      expect(entity.getCreatedDt()).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new PlanEntity();
    });

    it('should get/set plan_id', () => {
      entity.setPlanId('plan-100');
      expect(entity.getPlanId()).toBe('plan-100');
    });

    it('should get/set code', () => {
      entity.setCode('enterprise');
      expect(entity.getCode()).toBe('enterprise');
    });

    it('should get/set name', () => {
      entity.setName('Enterprise Plan');
      expect(entity.getName()).toBe('Enterprise Plan');
    });

    it('should get/set monthly_price_pence', () => {
      entity.setMonthlyPricePence(4999);
      expect(entity.getMonthlyPricePence()).toBe(4999);
    });

    it('should get/set max_upload_size_bytes', () => {
      entity.setMaxUploadSizeBytes(524288000);
      expect(entity.getMaxUploadSizeBytes()).toBe(524288000);
    });

    it('should get/set max_assets_count', () => {
      entity.setMaxAssetsCount(50000);
      expect(entity.getMaxAssetsCount()).toBe(50000);
    });

    it('should get/set max_collections_count', () => {
      entity.setMaxCollectionsCount(500);
      expect(entity.getMaxCollectionsCount()).toBe(500);
    });

    it('should get/set included_storage_bytes', () => {
      entity.setIncludedStorageBytes(53687091200);
      expect(entity.getIncludedStorageBytes()).toBe(53687091200);
    });

    it('should get/set included_egress_bytes', () => {
      entity.setIncludedEgressBytes(26843545600);
      expect(entity.getIncludedEgressBytes()).toBe(26843545600);
    });

    it('should get/set can_share_links', () => {
      entity.setCanShareLinks(false);
      expect(entity.getCanShareLinks()).toBe(false);
    });

    it('should get/set can_derivatives', () => {
      entity.setCanDerivatives(false);
      expect(entity.getCanDerivatives()).toBe(false);
    });

    it('should get/set can_video_transcode', () => {
      entity.setCanVideoTranscode(true);
      expect(entity.getCanVideoTranscode()).toBe(true);
    });

    it('should get/set can_ai_indexing', () => {
      entity.setCanAiIndexing(true);
      expect(entity.getCanAiIndexing()).toBe(true);
    });

    it('should get/set created_dt', () => {
      entity.setCreatedDt('2025-06-01T00:00:00Z');
      expect(entity.getCreatedDt()).toBe('2025-06-01T00:00:00Z');
    });
  });

  describe('logic methods', () => {
    it('isFree() should return true when monthly_price_pence is 0', () => {
      const entity = new PlanEntity();
      expect(entity.isFree()).toBe(true);
    });

    it('isFree() should return true when monthly_price_pence is explicitly 0', () => {
      const entity = new PlanEntity({ monthly_price_pence: 0 });
      expect(entity.isFree()).toBe(true);
    });

    it('isFree() should return false when monthly_price_pence is greater than 0', () => {
      const entity = new PlanEntity({ monthly_price_pence: 999 });
      expect(entity.isFree()).toBe(false);
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(PlanEntity.schema);
      expect(keys).toEqual([
        'plan_id', 'code', 'name', 'monthly_price_pence',
        'max_upload_size_bytes', 'max_assets_count', 'max_collections_count',
        'included_storage_bytes', 'included_egress_bytes',
        'can_share_links', 'can_derivatives', 'can_video_transcode',
        'can_ai_indexing', 'created_dt'
      ]);
    });

    it('should have correct default values', () => {
      expect(PlanEntity.schema.plan_id).toBeNull();
      expect(PlanEntity.schema.code).toBeNull();
      expect(PlanEntity.schema.name).toBeNull();
      expect(PlanEntity.schema.monthly_price_pence).toBe(0);
      expect(PlanEntity.schema.max_upload_size_bytes).toBeNull();
      expect(PlanEntity.schema.max_assets_count).toBeNull();
      expect(PlanEntity.schema.max_collections_count).toBeNull();
      expect(PlanEntity.schema.included_storage_bytes).toBe(0);
      expect(PlanEntity.schema.included_egress_bytes).toBe(0);
      expect(PlanEntity.schema.can_share_links).toBe(true);
      expect(PlanEntity.schema.can_derivatives).toBe(true);
      expect(PlanEntity.schema.can_video_transcode).toBe(false);
      expect(PlanEntity.schema.can_ai_indexing).toBe(false);
      expect(PlanEntity.schema.created_dt).toBeNull();
    });
  });

  describe('validation', () => {
    it('should be valid when code, name, monthly_price_pence, and max_upload_size_bytes are provided', () => {
      const entity = new PlanEntity({
        code: 'free',
        name: 'Free Plan',
        monthly_price_pence: '0',
        max_upload_size_bytes: '10485760'
      });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when code is empty string', () => {
      const entity = new PlanEntity({
        code: '',
        name: 'Free Plan',
        monthly_price_pence: '0',
        max_upload_size_bytes: '10485760'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when name is empty string', () => {
      const entity = new PlanEntity({
        code: 'free',
        name: '',
        monthly_price_pence: '0',
        max_upload_size_bytes: '10485760'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when monthly_price_pence is missing', () => {
      const entity = new PlanEntity({
        code: 'free',
        name: 'Free Plan',
        monthly_price_pence: null,
        max_upload_size_bytes: '10485760'
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when max_upload_size_bytes is missing', () => {
      const entity = new PlanEntity({
        code: 'free',
        name: 'Free Plan',
        monthly_price_pence: '0',
        max_upload_size_bytes: null
      });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when all required fields are missing', () => {
      const entity = new PlanEntity({
        monthly_price_pence: null,
        max_upload_size_bytes: null
      });
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new PlanEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
