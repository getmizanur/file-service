CREATE TABLE folder_event (
  event_id bigserial PRIMARY KEY,
  folder_id uuid NOT NULL REFERENCES folder(folder_id) ON DELETE CASCADE,
  event_type public.asset_event_type NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid REFERENCES app_user(user_id),
  created_dt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS folder_permission (
  permission_id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  folder_id uuid NOT NULL REFERENCES folder(folder_id) ON DELETE CASCADE,
  user_id uuid REFERENCES app_user(user_id),
  group_id uuid,
  role public.file_permission_role NOT NULL,
  inherit_to_children boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES app_user(user_id),
  created_dt timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR group_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_folder_permission_lookup
  ON folder_permission (tenant_id, folder_id);

CREATE INDEX IF NOT EXISTS idx_folder_permission_user
  ON folder_permission (tenant_id, user_id)
  WHERE user_id IS NOT NULL;


CREATE TABLE folder_share_link (
  share_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  folder_id uuid NOT NULL REFERENCES folder(folder_id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_dt timestamptz,
  password_hash text,
  created_by uuid REFERENCES app_user(user_id),
  created_dt timestamptz NOT NULL DEFAULT now(),
  revoked_dt timestamptz,
  UNIQUE (token_hash)
);