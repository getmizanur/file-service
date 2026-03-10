const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let PlanDTO;
beforeAll(() => {
  PlanDTO = require(path.join(projectRoot, 'application/dto/plan-dto'));
});

describe('PlanDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new PlanDTO();
  });

  it('should set plan_id via setPlanId', () => {
    dto.setPlanId('plan-001');
    expect(dto.plan_id).toBe('plan-001');
  });

  it('should set code via setCode', () => {
    dto.setCode('pro');
    expect(dto.code).toBe('pro');
  });

  it('should set name via setName', () => {
    dto.setName('Pro Plan');
    expect(dto.name).toBe('Pro Plan');
  });

  it('should set monthly_price_pence via setMonthlyPricePence', () => {
    dto.setMonthlyPricePence(999);
    expect(dto.monthly_price_pence).toBe(999);
  });

  it('should set max_upload_size_bytes via setMaxUploadSizeBytes', () => {
    dto.setMaxUploadSizeBytes(524288000);
    expect(dto.max_upload_size_bytes).toBe(524288000);
  });

  it('should set max_assets_count via setMaxAssetsCount', () => {
    dto.setMaxAssetsCount(10000);
    expect(dto.max_assets_count).toBe(10000);
  });

  it('should set max_collections_count via setMaxCollectionsCount', () => {
    dto.setMaxCollectionsCount(100);
    expect(dto.max_collections_count).toBe(100);
  });

  it('should set included_storage_bytes via setIncludedStorageBytes', () => {
    dto.setIncludedStorageBytes(10737418240);
    expect(dto.included_storage_bytes).toBe(10737418240);
  });

  it('should set included_egress_bytes via setIncludedEgressBytes', () => {
    dto.setIncludedEgressBytes(5368709120);
    expect(dto.included_egress_bytes).toBe(5368709120);
  });

  it('should set can_share_links via setCanShareLinks', () => {
    dto.setCanShareLinks(true);
    expect(dto.can_share_links).toBe(true);
  });

  it('should set can_derivatives via setCanDerivatives', () => {
    dto.setCanDerivatives(true);
    expect(dto.can_derivatives).toBe(true);
  });

  it('should set can_video_transcode via setCanVideoTranscode', () => {
    dto.setCanVideoTranscode(false);
    expect(dto.can_video_transcode).toBe(false);
  });

  it('should set can_ai_indexing via setCanAiIndexing', () => {
    dto.setCanAiIndexing(true);
    expect(dto.can_ai_indexing).toBe(true);
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set tenant_count via setTenantCount', () => {
    dto.setTenantCount(42);
    expect(dto.tenant_count).toBe(42);
  });
});
