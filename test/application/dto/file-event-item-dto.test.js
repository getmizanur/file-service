const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let FileEventItemDTO;
beforeAll(() => {
  FileEventItemDTO = require(path.join(projectRoot, 'application/dto/file-event-item-dto'));
});

describe('FileEventItemDTO', () => {
  let dto;
  beforeEach(() => {
    dto = new FileEventItemDTO();
  });

  it('should set event_id via setEventId', () => {
    dto.setEventId('evt-001');
    expect(dto.event_id).toBe('evt-001');
  });

  it('should set file_id via setFileId', () => {
    dto.setFileId('file-001');
    expect(dto.file_id).toBe('file-001');
  });

  it('should set event_type via setEventType', () => {
    dto.setEventType('upload');
    expect(dto.event_type).toBe('upload');
  });

  it('should set detail via setDetail', () => {
    dto.setDetail('File uploaded successfully');
    expect(dto.detail).toBe('File uploaded successfully');
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
