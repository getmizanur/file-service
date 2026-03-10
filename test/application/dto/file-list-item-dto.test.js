const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FileListItemDTO;
beforeAll(() => {
  FileListItemDTO = require(path.join(projectRoot, 'application/dto/file-list-item-dto'));
});

describe('FileListItemDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new FileListItemDTO();
  });

  it('should set id via setId', () => {
    dto.setId('file-001');
    expect(dto.id).toBe('file-001');
  });

  it('should set name via setName', () => {
    dto.setName('document.pdf');
    expect(dto.name).toBe('document.pdf');
  });

  it('should set owner via setOwner', () => {
    dto.setOwner('user-001');
    expect(dto.owner).toBe('user-001');
  });

  it('should set created_by via setCreatedBy', () => {
    dto.setCreatedBy('user-001');
    expect(dto.created_by).toBe('user-001');
  });

  it('should set last_modified via setLastModified', () => {
    dto.setLastModified('2025-02-01T00:00:00Z');
    expect(dto.last_modified).toBe('2025-02-01T00:00:00Z');
  });

  it('should set size_bytes via setSizeBytes', () => {
    dto.setSizeBytes(4096);
    expect(dto.size_bytes).toBe(4096);
  });

  it('should set item_type via setItemType', () => {
    dto.setItemType('file');
    expect(dto.item_type).toBe('file');
  });

  it('should set document_type via setDocumentType', () => {
    dto.setDocumentType('pdf');
    expect(dto.document_type).toBe('pdf');
  });

  it('should set visibility via setVisibility', () => {
    dto.setVisibility('private');
    expect(dto.visibility).toBe('private');
  });

  it('should set folder_id via setFolderId', () => {
    dto.setFolderId('folder-001');
    expect(dto.folder_id).toBe('folder-001');
  });

  it('should set original_filename via setOriginalFilename', () => {
    dto.setOriginalFilename('my-document.pdf');
    expect(dto.original_filename).toBe('my-document.pdf');
  });

  it('should set content_type via setContentType', () => {
    dto.setContentType('application/pdf');
    expect(dto.content_type).toBe('application/pdf');
  });

  it('should set location via setLocation', () => {
    dto.setLocation('/root/docs');
    expect(dto.location).toBe('/root/docs');
  });

  it('should set location_path via setLocationPath', () => {
    dto.setLocationPath('/root/docs/subfolder');
    expect(dto.location_path).toBe('/root/docs/subfolder');
  });
});
