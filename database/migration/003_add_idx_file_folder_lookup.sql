CREATE INDEX idx_file_folder_lookup
ON file_metadata (tenant_id, folder_id, deleted_at, updated_dt DESC);