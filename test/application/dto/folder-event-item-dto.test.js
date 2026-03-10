const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FolderEventItemDTO;
beforeAll(() => {
  FolderEventItemDTO = require(path.join(projectRoot, 'application/dto/folder-event-item-dto'));
});

describe('FolderEventItemDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new FolderEventItemDTO();
  });

  it('should set event_id via setEventId', () => {
    dto.setEventId('evt-001');
    expect(dto.event_id).toBe('evt-001');
  });

  it('should set folder_id via setFolderId', () => {
    dto.setFolderId('folder-001');
    expect(dto.folder_id).toBe('folder-001');
  });

  it('should set event_type via setEventType', () => {
    dto.setEventType('create');
    expect(dto.event_type).toBe('create');
  });

  it('should set detail via setDetail', () => {
    dto.setDetail('Folder created');
    expect(dto.detail).toBe('Folder created');
  });

  it('should set actor_user_id via setActorUserId', () => {
    dto.setActorUserId('user-001');
    expect(dto.actor_user_id).toBe('user-001');
  });

  it('should set created_dt via setCreatedDt', () => {
    dto.setCreatedDt('2025-01-01T00:00:00Z');
    expect(dto.created_dt).toBe('2025-01-01T00:00:00Z');
  });

  it('should set actor_display_name via setActorDisplayName', () => {
    dto.setActorDisplayName('John Doe');
    expect(dto.actor_display_name).toBe('John Doe');
  });

  it('should set actor_email via setActorEmail', () => {
    dto.setActorEmail('john@example.com');
    expect(dto.actor_email).toBe('john@example.com');
  });
});
