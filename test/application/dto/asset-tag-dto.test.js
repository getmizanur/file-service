const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let AssetTagDTO;
beforeAll(() => {
  AssetTagDTO = require(path.join(projectRoot, 'application/dto/asset-tag-dto'));
});

describe('AssetTagDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new AssetTagDTO();
  });

  it('should set file_id via setFileId', () => {
    dto.setFileId('file-001');
    expect(dto.file_id).toBe('file-001');
  });

  it('should set tag_id via setTagId', () => {
    dto.setTagId('tag-001');
    expect(dto.tag_id).toBe('tag-001');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set tag_name via setTagName', () => {
    dto.setTagName('Important');
    expect(dto.tag_name).toBe('Important');
  });

  it('should set tag_slug via setTagSlug', () => {
    dto.setTagSlug('important');
    expect(dto.tag_slug).toBe('important');
  });

  it('should set original_filename via setOriginalFilename', () => {
    dto.setOriginalFilename('document.pdf');
    expect(dto.original_filename).toBe('document.pdf');
  });
});
