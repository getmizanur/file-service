CREATE TABLE folder (
  folder_id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        uuid NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,

  parent_folder_id uuid REFERENCES folder(folder_id) ON DELETE CASCADE,
  name             text NOT NULL,

  created_by       uuid REFERENCES app_user(user_id) ON DELETE SET NULL,
  created_dt       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, parent_folder_id, name)
);

ALTER TABLE file_metadata
  ADD COLUMN folder_id uuid REFERENCES folder(folder_id) ON DELETE SET NULL;