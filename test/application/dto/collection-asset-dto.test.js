const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let CollectionAssetDTO;
beforeAll(() => {
  CollectionAssetDTO = require(path.join(projectRoot, 'application/dto/collection-asset-dto'));
});

describe('CollectionAssetDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new CollectionAssetDTO();
  });

  it('should set collection_id via setCollectionId', () => {
    dto.setCollectionId('col-001');
    expect(dto.collection_id).toBe('col-001');
  });

  it('should set file_id via setFileId', () => {
    dto.setFileId('file-001');
    expect(dto.file_id).toBe('file-001');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set collection_name via setCollectionName', () => {
    dto.setCollectionName('My Collection');
    expect(dto.collection_name).toBe('My Collection');
  });

  it('should set original_filename via setOriginalFilename', () => {
    dto.setOriginalFilename('photo.jpg');
    expect(dto.original_filename).toBe('photo.jpg');
  });

  it('should set record_status via setRecordStatus', () => {
    dto.setRecordStatus('active');
    expect(dto.record_status).toBe('active');
  });

  it('should set mime_type via setMimeType', () => {
    dto.setMimeType('image/jpeg');
    expect(dto.mime_type).toBe('image/jpeg');
  });

  it('should set file_size via setFileSize', () => {
    dto.setFileSize(1024);
    expect(dto.file_size).toBe(1024);
  });
});
