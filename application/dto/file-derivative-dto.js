// application/dto/file-derivative-dto.js
class FileDerivativeDTO {
  setDerivativeId(v) { this.derivative_id = v; }
  setFileId(v) { this.file_id = v; }
  setKind(v) { this.kind = v; }
  setSpec(v) { this.spec = v; }
  setStorageBackendId(v) { this.storage_backend_id = v; }
  setObjectKey(v) { this.object_key = v; }
  setStorageUri(v) { this.storage_uri = v; }
  setSizeBytes(v) { this.size_bytes = v; }
  setCreatedDt(v) { this.created_dt = v; }
  setStatus(v) { this.status = v; }
  setErrorDetail(v) { this.error_detail = v; }
  setAttempts(v) { this.attempts = v; }
  setLastAttemptDt(v) { this.last_attempt_dt = v; }
  setReadyDt(v) { this.ready_dt = v; }

  // Joined from file_metadata
  setOriginalFilename(v) { this.original_filename = v; }

  // Joined from storage_backend
  setBackendName(v) { this.backend_name = v; }
  setBackendProvider(v) { this.backend_provider = v; }
}

module.exports = FileDerivativeDTO;
