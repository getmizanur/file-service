CREATE INDEX idx_file_metadata_recent
ON file_metadata (tenant_id, created_by, created_dt DESC)
WHERE deleted_at IS NULL;