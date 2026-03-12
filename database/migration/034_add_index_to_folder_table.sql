CREATE INDEX IF NOT EXISTS idx_folder_parent
ON folder (tenant_id, parent_folder_id)
WHERE deleted_at IS NULL;
