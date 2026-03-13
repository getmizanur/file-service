-- Migration 039: Replace shared-flags indexes with COALESCE expression indexes
-- Enables index usage for rewritten queries that use COALESCE(expires_dt, 'infinity'::timestamptz) > NOW()

-- Drop old plain indexes from migration 038 that cannot serve COALESCE predicates
DROP INDEX IF EXISTS idx_share_link_active_file;
DROP INDEX IF EXISTS idx_folder_share_link_active_folder;

-- Drop previous iteration of this migration (if applied with old names)
DROP INDEX IF EXISTS idx_share_link_coalesce;
DROP INDEX IF EXISTS idx_folder_share_link_coalesce;

-- Serves fetchActiveByFileId (no tenant filter, single-file lookup)
CREATE INDEX IF NOT EXISTS idx_share_link_active_file_expr
  ON public.share_link (
    file_id,
    COALESCE(expires_dt, 'infinity'::timestamptz)
  )
  WHERE revoked_dt IS NULL;

-- Serves fetchSharedFileIds (tenant-scoped bulk lookup)
CREATE INDEX IF NOT EXISTS idx_share_link_tenant_active_file_expr
  ON public.share_link (
    tenant_id,
    file_id,
    COALESCE(expires_dt, 'infinity'::timestamptz)
  )
  WHERE revoked_dt IS NULL;

-- Serves fetchSharedFolderIds (tenant-scoped bulk lookup)
CREATE INDEX IF NOT EXISTS idx_folder_share_link_active_folder_expr
  ON public.folder_share_link (
    tenant_id,
    folder_id,
    COALESCE(expires_dt, 'infinity'::timestamptz)
  )
  WHERE revoked_dt IS NULL;

-- idx_file_permission_tenant_file from 038 remains unchanged (already optimal)
