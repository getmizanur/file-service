const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let SharedWithMeFileDTO;
beforeAll(() => {
  SharedWithMeFileDTO = require(path.join(projectRoot, 'application/dto/shared-with-me-file-dto'));
});

describe('SharedWithMeFileDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new SharedWithMeFileDTO();
  });

  it('should set id via setId', () => {
    dto.setId('file-001');
    expect(dto.id).toBe('file-001');
  });

  it('should set name via setName', () => {
    dto.setName('shared-doc.pdf');
    expect(dto.name).toBe('shared-doc.pdf');
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
    dto.setSizeBytes(8192);
    expect(dto.size_bytes).toBe(8192);
  });

  it('should set item_type via setItemType', () => {
    dto.setItemType('file');
    expect(dto.item_type).toBe('file');
  });

  it('should set document_type via setDocumentType', () => {
    dto.setDocumentType('pdf');
    expect(dto.document_type).toBe('pdf');
  });

  it('should set content_type via setContentType', () => {
    dto.setContentType('application/pdf');
    expect(dto.content_type).toBe('application/pdf');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set visibility via setVisibility', () => {
    dto.setVisibility('private');
    expect(dto.visibility).toBe('private');
  });

  it('should set my_role via setMyRole', () => {
    dto.setMyRole('viewer');
    expect(dto.my_role).toBe('viewer');
  });

  it('should set shared_at via setSharedAt', () => {
    dto.setSharedAt('2025-01-10T00:00:00Z');
    expect(dto.shared_at).toBe('2025-01-10T00:00:00Z');
  });

  it('should set shared_by via setSharedBy', () => {
    dto.setSharedBy('user-002');
    expect(dto.shared_by).toBe('user-002');
  });
});
