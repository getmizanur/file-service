const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let UsageDailyEntity;
beforeAll(() => {
  UsageDailyEntity = require(globalThis.applicationPath('/application/entity/usage-daily-entity'));
});

describe('UsageDailyEntity', () => {
  describe('constructor', () => {
    it('should create an entity with no data', () => {
      const entity = new UsageDailyEntity();
      expect(entity.getTenantId()).toBeNull();
      expect(entity.getDay()).toBeNull();
      expect(entity.getStorageBytes()).toBe(0);
      expect(entity.getEgressBytes()).toBe(0);
      expect(entity.getUploadsCount()).toBe(0);
      expect(entity.getDownloadsCount()).toBe(0);
      expect(entity.getTransformsCount()).toBe(0);
    });

    it('should create an entity with data', () => {
      const data = {
        tenant_id: 't-1',
        day: '2025-06-15',
        storage_bytes: 1073741824,
        egress_bytes: 536870912,
        uploads_count: 50,
        downloads_count: 200,
        transforms_count: 10
      };
      const entity = new UsageDailyEntity(data);
      expect(entity.getTenantId()).toBe('t-1');
      expect(entity.getDay()).toBe('2025-06-15');
      expect(entity.getStorageBytes()).toBe(1073741824);
      expect(entity.getEgressBytes()).toBe(536870912);
      expect(entity.getUploadsCount()).toBe(50);
      expect(entity.getDownloadsCount()).toBe(200);
      expect(entity.getTransformsCount()).toBe(10);
    });
  });

  describe('getters and setters', () => {
    let entity;
    beforeEach(() => {
      entity = new UsageDailyEntity();
    });

    it('should get/set tenant_id', () => {
      entity.setTenantId('t-100');
      expect(entity.getTenantId()).toBe('t-100');
    });

    it('should get/set day', () => {
      entity.setDay('2025-07-01');
      expect(entity.getDay()).toBe('2025-07-01');
    });

    it('should get/set storage_bytes', () => {
      entity.setStorageBytes(2147483648);
      expect(entity.getStorageBytes()).toBe(2147483648);
    });

    it('should get/set egress_bytes', () => {
      entity.setEgressBytes(1073741824);
      expect(entity.getEgressBytes()).toBe(1073741824);
    });

    it('should get/set uploads_count', () => {
      entity.setUploadsCount(100);
      expect(entity.getUploadsCount()).toBe(100);
    });

    it('should get/set downloads_count', () => {
      entity.setDownloadsCount(500);
      expect(entity.getDownloadsCount()).toBe(500);
    });

    it('should get/set transforms_count', () => {
      entity.setTransformsCount(25);
      expect(entity.getTransformsCount()).toBe(25);
    });
  });

  describe('schema', () => {
    it('should have the correct schema keys', () => {
      const keys = Object.keys(UsageDailyEntity.schema);
      expect(keys).toEqual([
        'tenant_id', 'day', 'storage_bytes', 'egress_bytes',
        'uploads_count', 'downloads_count', 'transforms_count'
      ]);
    });

    it('should have correct default values', () => {
      expect(UsageDailyEntity.schema.tenant_id).toBeNull();
      expect(UsageDailyEntity.schema.day).toBeNull();
      expect(UsageDailyEntity.schema.storage_bytes).toBe(0);
      expect(UsageDailyEntity.schema.egress_bytes).toBe(0);
      expect(UsageDailyEntity.schema.uploads_count).toBe(0);
      expect(UsageDailyEntity.schema.downloads_count).toBe(0);
      expect(UsageDailyEntity.schema.transforms_count).toBe(0);
    });
  });

  describe('validation', () => {
    it('should be valid when tenant_id and day are provided', () => {
      const entity = new UsageDailyEntity({ tenant_id: 't-1', day: '2025-06-15' });
      expect(entity.isValid()).toBe(true);
    });

    it('should be invalid when tenant_id is missing', () => {
      const entity = new UsageDailyEntity({ day: '2025-06-15' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when day is missing', () => {
      const entity = new UsageDailyEntity({ tenant_id: 't-1' });
      expect(entity.isValid()).toBe(false);
    });

    it('should be invalid when both required fields are missing', () => {
      const entity = new UsageDailyEntity();
      expect(entity.isValid()).toBe(false);
    });
  });

  describe('getInputFilter caching', () => {
    it('should return the same InputFilter instance on second call', () => {
      const entity = new UsageDailyEntity();
      const filter1 = entity.getInputFilter();
      const filter2 = entity.getInputFilter();
      expect(filter1).toBe(filter2);
    });
  });
});
