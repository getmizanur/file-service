ALTER TABLE collection
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES app_user(user_id) ON DELETE SET NULL;

-- Drop old uniqueness (likely UNIQUE (tenant_id, name))
ALTER TABLE collection
  DROP CONSTRAINT IF EXISTS collection_tenant_id_name_key;

-- Active-only uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uq_collection_active_name
  ON collection (tenant_id, lower(name))
  WHERE deleted_at IS NULL;