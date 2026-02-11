-- ============================================================
-- FILE SERVICE (Asset Manager first, Drive-like later)
-- FINAL FULL POSTGRES SCHEMA (corrected)
-- Tenant/Plan/Policy, provider-agnostic storage,
-- sharing permissions (people/groups/general access), and password auth
-- ============================================================

-- =========================================
-- EXTENSIONS
-- =========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','canceled');
CREATE TYPE integration_status  AS ENUM ('active','inactive');

CREATE TYPE storage_provider AS ENUM (
  'aws_s3',
  'azure_blob',
  'gcp_gcs',
  'minio_s3',
  'filesystem',
  'sftp'
);

CREATE TYPE delivery_strategy AS ENUM (
  'cloudfront_signed_url',
  'cloudfront_signed_cookie',
  'azure_cdn_token',
  'gcp_cdn_signed_url',
  'app_stream',
  'nginx_signed_url'
);

CREATE TYPE visibility_default  AS ENUM ('private','public');

CREATE TYPE gdpr_flag AS ENUM ('false', 'true', 'delete', 'protect');
CREATE TYPE record_status AS ENUM ('upload', 'deleted');
CREATE TYPE record_sub_status AS ENUM ('upload','pending','completed','deleted','gdpr','retention','customer');

CREATE TYPE user_status AS ENUM ('active','invited','disabled');
CREATE TYPE tenant_role AS ENUM ('owner','admin','member','viewer');

CREATE TYPE asset_event_type AS ENUM (
  'UPLOAD_INITIATED',
  'UPLOADED',
  'UPLOAD_COMPLETED',
  'ACCESS_GRANTED',
  'DOWNLOADED',
  'VIEWED',
  'DELETED',
  'RESTORED',
  'GDPR_FLAGGED',
  'RETENTION_EXPIRED',
  'METADATA_UPDATED',
  'DERIVATIVE_CREATED'
);

CREATE TYPE general_access AS ENUM ('restricted','anyone_with_link');
CREATE TYPE file_permission_role AS ENUM ('owner','editor','commenter','viewer');

-- =========================================
-- COMMERCIAL: PLAN / TENANT / SUBSCRIPTION
-- =========================================
CREATE TABLE plan (
  plan_id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                    text NOT NULL UNIQUE,
  name                    text NOT NULL,
  monthly_price_pence     integer NOT NULL DEFAULT 0,

  max_upload_size_bytes   bigint NOT NULL,
  max_assets_count        integer,
  max_collections_count   integer,

  included_storage_bytes  bigint NOT NULL DEFAULT 0,
  included_egress_bytes   bigint NOT NULL DEFAULT 0,

  can_share_links         boolean NOT NULL DEFAULT true,
  can_derivatives         boolean NOT NULL DEFAULT true,
  can_video_transcode     boolean NOT NULL DEFAULT false,
  can_ai_indexing         boolean NOT NULL DEFAULT false,

  created_dt              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_plan_max_upload_positive CHECK (max_upload_size_bytes > 0)
);

CREATE TABLE tenant (
  tenant_id     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  status        text NOT NULL DEFAULT 'active',
  created_dt    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subscription (
  subscription_id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id              uuid NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  plan_id                uuid NOT NULL REFERENCES plan(plan_id),
  status                 subscription_status NOT NULL,
  current_period_start   timestamptz NOT NULL,
  current_period_end     timestamptz NOT NULL,
  external_ref           text,
  created_dt             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

-- =========================================
-- USERS (MVC login capable)
-- =========================================
CREATE TABLE app_user (
  user_id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           text NOT NULL UNIQUE,
  display_name    text,
  status          user_status NOT NULL DEFAULT 'active',
  email_verified  boolean NOT NULL DEFAULT false,
  created_dt      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tenant_member (
  tenant_id     uuid NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  role          tenant_role NOT NULL DEFAULT 'member',
  created_dt    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE user_auth_password (
  user_id              uuid PRIMARY KEY REFERENCES app_user(user_id) ON DELETE CASCADE,
  password_hash        text NOT NULL,
  password_algo        text NOT NULL DEFAULT 'argon2id',
  password_updated_dt  timestamptz NOT NULL DEFAULT now(),

  failed_attempts      integer NOT NULL DEFAULT 0,
  locked_until         timestamptz,
  last_login_dt        timestamptz,

  created_dt           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_auth_locked ON user_auth_password(locked_until);

CREATE TABLE email_verification_token (
  token_id     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  expires_dt   timestamptz NOT NULL,
  used_dt      timestamptz,
  created_dt   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE password_reset_token (
  token_id     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  expires_dt   timestamptz NOT NULL,
  used_dt      timestamptz,
  created_dt   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pwd_reset_user ON password_reset_token(user_id, created_dt DESC);

-- =========================================
-- STORAGE ABSTRACTION (provider-agnostic)
-- =========================================
CREATE TABLE storage_backend (
  storage_backend_id   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 text NOT NULL UNIQUE,
  provider             storage_provider NOT NULL,
  delivery             delivery_strategy NOT NULL,
  is_enabled           boolean NOT NULL DEFAULT true,

  config               jsonb NOT NULL DEFAULT '{}',

  created_dt           timestamptz NOT NULL DEFAULT now(),
  updated_dt           timestamptz NOT NULL DEFAULT now()
);

-- =========================================
-- INTEGRATIONS
-- =========================================
CREATE TABLE integration (
  integration_id   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        uuid NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  code             text NOT NULL,
  name             text NOT NULL,
  status           integration_status NOT NULL DEFAULT 'active',

  webhook_url      text,
  webhook_secret_hash text,

  created_dt       timestamptz NOT NULL DEFAULT now(),
  updated_dt       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, code)
);

CREATE INDEX idx_integration_tenant ON integration(tenant_id);

-- =========================================
-- TENANT POLICY + Integration overrides
-- =========================================
CREATE TABLE tenant_policy (
  tenant_id                  uuid PRIMARY KEY REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  storage_backend_id         uuid NOT NULL REFERENCES storage_backend(storage_backend_id),
  key_template               text NOT NULL,

  presigned_url_ttl_seconds  integer NOT NULL DEFAULT 900,
  default_retention_days     integer,
  av_required                boolean NOT NULL DEFAULT true,

  allowed_mime_types         text[] NOT NULL DEFAULT '{}',
  default_visibility         visibility_default NOT NULL DEFAULT 'private',

  webhook_url                text,
  webhook_secret_hash        text,

  updated_dt                 timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_tenant_policy_ttl_positive CHECK (presigned_url_ttl_seconds > 0)
);

CREATE TABLE integration_policy_override (
  integration_id             uuid PRIMARY KEY REFERENCES integration(integration_id) ON DELETE CASCADE,

  storage_backend_id         uuid REFERENCES storage_backend(storage_backend_id),
  key_template               text,

  presigned_url_ttl_seconds  integer,
  retention_days             integer,
  av_required                boolean,
  allowed_mime_types         text[],
  default_visibility         visibility_default,

  max_upload_size_bytes      bigint,

  updated_dt                 timestamptz NOT NULL DEFAULT now()
);

-- =========================================
-- AUTH KEYS
-- =========================================
CREATE TABLE api_key (
  api_key_id       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        uuid NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  integration_id   uuid REFERENCES integration(integration_id) ON DELETE SET NULL,
  name             text NOT NULL,
  key_hash         text NOT NULL,
  last_used_dt     timestamptz,
  created_dt       timestamptz NOT NULL DEFAULT now(),
  revoked_dt       timestamptz
);

CREATE INDEX idx_api_key_tenant ON api_key(tenant_id);
CREATE INDEX idx_api_key_integration ON api_key(integration_id);

-- =========================================
-- COLLECTIONS
-- =========================================
CREATE TABLE collection (
  collection_id  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      uuid NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  name           text NOT NULL,
  description    text,
  created_by     uuid REFERENCES app_user(user_id) ON DELETE SET NULL,
  created_dt     timestamptz NOT NULL DEFAULT now(),
  updated_dt     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX idx_collection_tenant ON collection(tenant_id);

-- =========================================
-- FILE METADATA
-- =========================================
CREATE TABLE file_metadata (
  file_id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  tenant_id               uuid NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  integration_id          uuid REFERENCES integration(integration_id) ON DELETE SET NULL,

  storage_backend_id      uuid NOT NULL REFERENCES storage_backend(storage_backend_id),

  title                   text,
  description             text,

  application_ref_id      text,
  document_type           text NOT NULL,
  document_type_id        text,

  object_key              text NOT NULL,
  storage_uri             text,

  original_filename       text NOT NULL,
  content_type            text,
  size_bytes              bigint,
  checksum_sha256         text,

  retention_days          integer,
  expires_at              timestamptz,
  gdpr_flag               gdpr_flag NOT NULL DEFAULT 'false',

  record_status           record_status NOT NULL DEFAULT 'upload',
  record_sub_status       record_sub_status NOT NULL DEFAULT 'pending',
  request_count           integer NOT NULL DEFAULT 0,

  visibility              visibility_default NOT NULL DEFAULT 'private',
  general_access          general_access NOT NULL DEFAULT 'restricted',

  deleted_at              timestamptz,
  deleted_by              uuid REFERENCES app_user(user_id) ON DELETE SET NULL,

  created_by              uuid REFERENCES app_user(user_id) ON DELETE SET NULL,
  created_dt              timestamptz NOT NULL DEFAULT now(),
  updated_by              uuid REFERENCES app_user(user_id) ON DELETE SET NULL,
  updated_dt              timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, storage_backend_id, object_key),

  CONSTRAINT ck_file_size_nonneg CHECK (size_bytes IS NULL OR size_bytes >= 0)
);

CREATE INDEX idx_file_tenant_created     ON file_metadata(tenant_id, created_dt DESC);
CREATE INDEX idx_file_tenant_doc_type    ON file_metadata(tenant_id, document_type, created_dt DESC);
CREATE INDEX idx_file_tenant_integration ON file_metadata(tenant_id, integration_id, created_dt DESC);
CREATE INDEX idx_file_status             ON file_metadata(record_status, record_sub_status);
CREATE INDEX idx_file_expires_at         ON file_metadata(expires_at) WHERE expires_at IS NOT NULL;

CREATE TABLE collection_asset (
  collection_id  uuid NOT NULL REFERENCES collection(collection_id) ON DELETE CASCADE,
  file_id        uuid NOT NULL REFERENCES file_metadata(file_id) ON DELETE CASCADE,
  created_dt     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, file_id)
);

-- =========================================
-- TAGS (FIXED: use unique index for lower(name))
-- =========================================
CREATE TABLE tag (
  tag_id      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_dt  timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness per tenant
CREATE UNIQUE INDEX uq_tag_tenant_lower_name
  ON tag (tenant_id, lower(name));

CREATE TABLE asset_tag (
  file_id     uuid NOT NULL REFERENCES file_metadata(file_id) ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES tag(tag_id) ON DELETE CASCADE,
  created_dt  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (file_id, tag_id)
);

CREATE INDEX idx_asset_tag_tag ON asset_tag(tag_id);

-- =========================================
-- DERIVATIVES
-- =========================================
CREATE TABLE file_derivative (
  derivative_id      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id            uuid NOT NULL REFERENCES file_metadata(file_id) ON DELETE CASCADE,

  kind               text NOT NULL,
  spec               jsonb NOT NULL DEFAULT '{}',

  storage_backend_id uuid NOT NULL REFERENCES storage_backend(storage_backend_id),
  object_key         text NOT NULL,
  storage_uri        text,

  size_bytes         bigint,
  created_dt         timestamptz NOT NULL DEFAULT now(),

  UNIQUE (file_id, kind, spec)
);

CREATE INDEX idx_derivative_file ON file_derivative(file_id);

-- =========================================
-- EVENTS / AUDIT
-- =========================================
CREATE TABLE file_event (
  event_id      bigserial PRIMARY KEY,
  file_id       uuid NOT NULL REFERENCES file_metadata(file_id) ON DELETE CASCADE,
  event_type    asset_event_type NOT NULL,
  detail        jsonb NOT NULL DEFAULT '{}',
  actor_user_id uuid REFERENCES app_user(user_id) ON DELETE SET NULL,
  created_dt    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_file_event_file  ON file_event(file_id, created_dt DESC);
CREATE INDEX idx_file_event_actor ON file_event(actor_user_id, created_dt DESC);

-- =========================================
-- SHARE LINKS (copy link)
-- =========================================
CREATE TABLE share_link (
  share_id       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      uuid NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  file_id        uuid NOT NULL REFERENCES file_metadata(file_id) ON DELETE CASCADE,

  token_hash     text NOT NULL UNIQUE,
  expires_dt     timestamptz,
  password_hash  text,
  created_by     uuid REFERENCES app_user(user_id) ON DELETE SET NULL,
  created_dt     timestamptz NOT NULL DEFAULT now(),
  revoked_dt     timestamptz
);

CREATE INDEX idx_share_link_tenant ON share_link(tenant_id);

-- =========================================
-- GROUPS + FILE PERMISSIONS (FIXED: user_group uniqueness via index)
-- =========================================
CREATE TABLE user_group (
  group_id    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_dt  timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness per tenant
CREATE UNIQUE INDEX uq_user_group_tenant_lower_name
  ON user_group (tenant_id, lower(name));

CREATE TABLE user_group_member (
  group_id   uuid NOT NULL REFERENCES user_group(group_id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  created_dt timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_member_user ON user_group_member(user_id);

CREATE TABLE file_permission (
  permission_id bigserial PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  file_id       uuid NOT NULL REFERENCES file_metadata(file_id) ON DELETE CASCADE,

  user_id       uuid REFERENCES app_user(user_id) ON DELETE CASCADE,
  group_id      uuid REFERENCES user_group(group_id) ON DELETE CASCADE,

  role          file_permission_role NOT NULL DEFAULT 'viewer',
  created_by    uuid REFERENCES app_user(user_id) ON DELETE SET NULL,
  created_dt    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_file_perm_subject CHECK (
    (user_id IS NOT NULL AND group_id IS NULL) OR
    (user_id IS NULL AND group_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uq_file_perm_user
  ON file_permission(file_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX uq_file_perm_group
  ON file_permission(file_id, group_id)
  WHERE group_id IS NOT NULL;

CREATE INDEX idx_file_perm_file  ON file_permission(file_id);
CREATE INDEX idx_file_perm_user  ON file_permission(user_id);
CREATE INDEX idx_file_perm_group ON file_permission(group_id);

-- =========================================
-- USAGE METERING
-- =========================================
CREATE TABLE usage_daily (
  usage_id         bigserial PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  day              date NOT NULL,

  storage_bytes    bigint NOT NULL DEFAULT 0,
  egress_bytes     bigint NOT NULL DEFAULT 0,
  uploads_count    integer NOT NULL DEFAULT 0,
  downloads_count  integer NOT NULL DEFAULT 0,
  transforms_count integer NOT NULL DEFAULT 0,

  UNIQUE (tenant_id, day)
);

CREATE INDEX idx_usage_tenant_day ON usage_daily(tenant_id, day DESC);

-- ============================================================
-- END SCHEMA
-- ============================================================