ALTER TABLE folder
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES app_user(user_id) ON DELETE SET NULL;