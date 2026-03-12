-- Migration 038: Add indexes to speed up shared-flags bulk lookups
-- These indexes support the ANY($1::uuid[]) queries in _populateSharedFlags.

-- Partial index on share_link: skips revoked rows, covers file_id + expires_dt
CREATE INDEX IF NOT EXISTS idx_share_link_active_file
ON share_link (file_id, expires_dt)
WHERE revoked_dt IS NULL;

-- Index on file_permission for tenant-scoped file lookups
CREATE INDEX IF NOT EXISTS idx_file_permission_tenant_file
ON file_permission (tenant_id, file_id);

-- Partial index on folder_share_link: skips revoked rows, covers tenant + folder + expires
CREATE INDEX IF NOT EXISTS idx_folder_share_link_active_folder
ON folder_share_link (tenant_id, folder_id, expires_dt)
WHERE revoked_dt IS NULL;
