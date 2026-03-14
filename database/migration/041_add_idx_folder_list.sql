-- Covers: SELECT ... FROM folder WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name
-- Used by: fetchByTenant(), fetchByParent() sort by name
CREATE INDEX IF NOT EXISTS idx_folder_list
ON folder (tenant_id, name)
WHERE deleted_at IS NULL;
