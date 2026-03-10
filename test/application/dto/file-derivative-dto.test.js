const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FileDerivativeDTO;
beforeAll(() => {
  FileDerivativeDTO = require(path.join(projectRoot, 'application/dto/file-derivative-dto'));
});

describe('FileDerivativeDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new FileDerivativeDTO();
  });

  it('should set derivative_id via setDerivativeId', () => {
    dto.setDerivativeId('deriv-001');
    expect(dto.derivative_id).toBe('deriv-001');
  });

  it('should set file_id via setFileId', () => {
    dto.setFileId('file-001');
    expect(dto.file_id).toBe('file-001');
  });

  it('should set kind via setKind', () => {
    dto.setKind('thumbnail');
    expect(dto.kind).toBe('thumbnail');
  });

  it('should set spec via setSpec', () => {
    dto.setSpec('200x200');
    expect(dto.spec).toBe('200x200');
  });

  it('should set storage_backend_id via setStorageBackendId', () => {
    dto.setStorageBackendId('backend-001');
    expect(dto.storage_backend_id).toBe('backend-001');
  });

  it('should set object_key via setObjectKey', () => {
    dto.setObjectKey('files/thumb/001.jpg');
    expect(dto.object_key).toBe('files/thumb/001.jpg');
  });

  it('should set storage_uri via setStorageUri', () => {
    dto.setStorageUri('s3://bucket/key');
    expect(dto.storage_uri).toBe('s3://bucket/key');
  });

  it('should set size_bytes via setSizeBytes', () => {
    dto.setSizeBytes(2048);
    expect(dto.size_bytes).toBe(2048);
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set status via setStatus', () => {
    dto.setStatus('ready');
    expect(dto.status).toBe('ready');
  });

  it('should set error_detail via setErrorDetail', () => {
    dto.setErrorDetail('Processing failed');
    expect(dto.error_detail).toBe('Processing failed');
  });

  it('should set attempts via setAttempts', () => {
    dto.setAttempts(3);
    expect(dto.attempts).toBe(3);
  });

  it('should set last_attempt_dt via setLastAttemptDt', () => {
    dto.setLastAttemptDt('2025-01-02T00:00:00Z');
    expect(dto.last_attempt_dt).toBe('2025-01-02T00:00:00Z');
  });

  it('should set ready_dt via setReadyDt', () => {
    dto.setReadyDt('2025-01-01T01:00:00Z');
    expect(dto.ready_dt).toBe('2025-01-01T01:00:00Z');
  });

  it('should set processing_started_dt via setProcessingStartedDt', () => {
    dto.setProcessingStartedDt('2025-01-01T00:30:00Z');
    expect(dto.processing_started_dt).toBe('2025-01-01T00:30:00Z');
  });

  it('should set updated_dt via setUpdatedDt', () => {
    dto.setUpdatedDt('2025-02-01T00:00:00Z');
    expect(dto.updated_dt).toBe('2025-02-01T00:00:00Z');
  });

  it('should set original_filename via setOriginalFilename', () => {
    dto.setOriginalFilename('image.png');
    expect(dto.original_filename).toBe('image.png');
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
