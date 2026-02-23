// application/dto/file-event-item-dto.js
class FileEventItemDTO {
  setEventId(v) { this.event_id = v; }
  setFileId(v) { this.file_id = v; }
  setEventType(v) { this.event_type = v; }
  setDetail(v) { this.detail = v; }
  setActorUserId(v) { this.actor_user_id = v; }
  setCreatedDt(v) { this.created_dt = v; }

  // projection fields
  setActorDisplayName(v) { this.actor_display_name = v; }
  setActorEmail(v) { this.actor_email = v; }
}

module.exports = FileEventItemDTO;