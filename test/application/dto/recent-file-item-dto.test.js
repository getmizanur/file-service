const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let RecentFileItemDTO;
beforeAll(() => {
  RecentFileItemDTO = require(path.join(projectRoot, 'application/dto/recent-file-item-dto'));
});

describe('RecentFileItemDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new RecentFileItemDTO();
  });

  it('should set id via setId', () => {
    dto.setId('file-001');
    expect(dto.id).toBe('file-001');
  });

  it('should set name via setName', () => {
    dto.setName('photo.jpg');
    expect(dto.name).toBe('photo.jpg');
  });

  it('should set owner via setOwner', () => {
    dto.setOwner('user-001');
    expect(dto.owner).toBe('user-001');
  });

  it('should set last_modified via setLastModified', () => {
    dto.setLastModified('2025-02-01T00:00:00Z');
    expect(dto.last_modified).toBe('2025-02-01T00:00:00Z');
  });

  it('should set size_bytes via setSizeBytes', () => {
    dto.setSizeBytes(2048);
    expect(dto.size_bytes).toBe(2048);
  });

  it('should set item_type via setItemType', () => {
    dto.setItemType('file');
    expect(dto.item_type).toBe('file');
  });

  it('should set document_type via setDocumentType', () => {
    dto.setDocumentType('image');
    expect(dto.document_type).toBe('image');
  });

  it('should set content_type via setContentType', () => {
    dto.setContentType('image/jpeg');
    expect(dto.content_type).toBe('image/jpeg');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set visibility via setVisibility', () => {
    dto.setVisibility('public');
    expect(dto.visibility).toBe('public');
  });
});
