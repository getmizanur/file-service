-- Migration: Add updated_by and updated_dt columns to folder table

ALTER TABLE folder
ADD COLUMN IF NOT EXISTS updated_dt timestamptz NOT NULL DEFAULT now();

ALTER TABLE folder
ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE folder
ADD CONSTRAINT folder_updated_by_fkey
FOREIGN KEY (updated_by)
REFERENCES app_user(user_id)
ON DELETE SET NULL;