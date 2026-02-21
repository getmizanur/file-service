CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_folder_name_trgm
ON folder USING gin (name gin_trgm_ops)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_file_title_trgm
ON file_metadata USING gin (title gin_trgm_ops)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_file_permission_user
ON file_permission (tenant_id, user_id, file_id);