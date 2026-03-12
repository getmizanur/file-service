-- Migration 035: Add deletion_audit table
--
-- Purpose:
--   Provides a durable audit trail for permanently deleted files and folders.
--   Unlike file_event / folder_event, this table has NO foreign key back to
--   file_metadata or folder, so it survives hard deletes and cascade operations.
--
-- Records must be inserted BEFORE the hard delete so that object_key and other
-- metadata can be captured. The row will NOT be removed when the parent row
-- is deleted.

CREATE TABLE IF NOT EXISTS public.deletion_audit (
    audit_id    bigserial PRIMARY KEY,
    tenant_id   uuid        NOT NULL,
    asset_type  text        NOT NULL,
    asset_id    uuid        NOT NULL,
    object_key  text,
    actor_user_id uuid,
    mode        text        NOT NULL,
    created_dt  timestamptz NOT NULL DEFAULT now(),
    detail      jsonb       NOT NULL DEFAULT '{}'::jsonb,

    CONSTRAINT chk_deletion_audit_asset_type CHECK (asset_type IN ('file', 'folder')),
    CONSTRAINT chk_deletion_audit_mode       CHECK (mode IN ('permanent', 'empty_trash'))
);

-- Index for per-tenant audit queries
CREATE INDEX IF NOT EXISTS idx_deletion_audit_tenant
    ON public.deletion_audit (tenant_id, created_dt DESC);

-- Index to look up audit records by asset
CREATE INDEX IF NOT EXISTS idx_deletion_audit_asset
    ON public.deletion_audit (asset_id);

COMMENT ON TABLE public.deletion_audit IS
    'Durable audit log for permanent deletes. No FK to file_metadata or folder — survives cascades. Insert before hard delete.';

COMMENT ON COLUMN public.deletion_audit.object_key IS
    'Storage object key captured at deletion time. Used by the storage cleanup job to purge orphaned objects.';

COMMENT ON COLUMN public.deletion_audit.mode IS
    'permanent = single item delete; empty_trash = bulk tenant trash purge.';
