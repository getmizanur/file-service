-- Drop possible constraint names (safe even if they don't exist)
ALTER TABLE folder DROP CONSTRAINT IF EXISTS folder_tenant_parent_name_key;
ALTER TABLE folder DROP CONSTRAINT IF EXISTS folder_tenant_id_parent_folder_id_name_key;
ALTER TABLE folder DROP CONSTRAINT IF EXISTS folder_tenant_id_parent_folder_id_lower_name_key;

-- Drop possible index names (safe even if they don't exist)
DROP INDEX IF EXISTS ux_folder_unique_active;
DROP INDEX IF EXISTS uq_folder_active_name;
DROP INDEX IF EXISTS folder_tenant_parent_name_idx;

-- Create the partial unique index
CREATE UNIQUE INDEX ux_folder_unique_active
ON folder (tenant_id, parent_folder_id, lower(name))
WHERE deleted_at IS NULL;