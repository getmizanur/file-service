const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let IntegrationPolicyOverrideDTO;
beforeAll(() => {
  IntegrationPolicyOverrideDTO = require(path.join(projectRoot, 'application/dto/integration-policy-override-dto'));
});

describe('IntegrationPolicyOverrideDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new IntegrationPolicyOverrideDTO();
  });

  it('should set integration_id via setIntegrationId', () => {
    dto.setIntegrationId('int-001');
    expect(dto.integration_id).toBe('int-001');
  });

  it('should set storage_backend_id via setStorageBackendId', () => {
    dto.setStorageBackendId('backend-001');
    expect(dto.storage_backend_id).toBe('backend-001');
  });

  it('should set key_template via setKeyTemplate', () => {
    dto.setKeyTemplate('uploads/{tenant}/{file}');
    expect(dto.key_template).toBe('uploads/{tenant}/{file}');
  });

  it('should set presigned_url_ttl_seconds via setPresignedUrlTtlSeconds', () => {
    dto.setPresignedUrlTtlSeconds(3600);
    expect(dto.presigned_url_ttl_seconds).toBe(3600);
  });

  it('should set retention_days via setRetentionDays', () => {
    dto.setRetentionDays(90);
    expect(dto.retention_days).toBe(90);
  });

  it('should set av_required via setAvRequired', () => {
    dto.setAvRequired(true);
    expect(dto.av_required).toBe(true);
  });

  it('should set allowed_mime_types via setAllowedMimeTypes', () => {
    dto.setAllowedMimeTypes('image/*,application/pdf');
    expect(dto.allowed_mime_types).toBe('image/*,application/pdf');
  });

  it('should set default_visibility via setDefaultVisibility', () => {
    dto.setDefaultVisibility('private');
    expect(dto.default_visibility).toBe('private');
  });

  it('should set max_upload_size_bytes via setMaxUploadSizeBytes', () => {
    dto.setMaxUploadSizeBytes(104857600);
    expect(dto.max_upload_size_bytes).toBe(104857600);
  });

  it('should set updated_dt via setUpdatedDt', () => {
    dto.setUpdatedDt('2025-02-01T00:00:00Z');
    expect(dto.updated_dt).toBe('2025-02-01T00:00:00Z');
  });

  it('should set integration_name via setIntegrationName', () => {
    dto.setIntegrationName('Slack');
    expect(dto.integration_name).toBe('Slack');
  });

  it('should set backend_name via setBackendName', () => {
    dto.setBackendName('S3 Primary');
    expect(dto.backend_name).toBe('S3 Primary');
  });

  it('should set backend_provider via setBackendProvider', () => {
    dto.setBackendProvider('aws-s3');
    expect(dto.backend_provider).toBe('aws-s3');
  });
});
