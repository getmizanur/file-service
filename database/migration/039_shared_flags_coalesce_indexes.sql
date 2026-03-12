-- Migration 039: Replace shared-flags indexes with COALESCE expression indexes
-- Enables index usage for rewritten queries that use COALESCE(expires_dt, 'infinity'::timestamptz) > NOW()

-- Drop old indexes that cannot serve COALESCE predicates
DROP INDEX IF EXISTS idx_share_link_active_file;
DROP INDEX IF EXISTS idx_folder_share_link_active_folder;

-- Expression index for share_link (now includes tenant_id)
CREATE INDEX IF NOT EXISTS idx_share_link_coalesce
  ON share_link (tenant_id, file_id, COALESCE(expires_dt, 'infinity'::timestamptz))
  WHERE revoked_dt IS NULL;

-- Expression index for folder_share_link
CREATE INDEX IF NOT EXISTS idx_folder_share_link_coalesce
  ON folder_share_link (tenant_id, folder_id, COALESCE(expires_dt, 'infinity'::timestamptz))
  WHERE revoked_dt IS NULL;

-- idx_file_permission_tenant_file from 038 remains unchanged (already optimal)
