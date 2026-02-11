BEGIN;

-- ============================================================
-- 1) PLAN
-- ============================================================
INSERT INTO plan (
  plan_id, code, name, monthly_price_pence,
  max_upload_size_bytes, max_assets_count, max_collections_count,
  included_storage_bytes, included_egress_bytes,
  can_share_links, can_derivatives, can_video_transcode, can_ai_indexing,
  created_dt
) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'starter',
  'Starter',
  0,
  52428800,        -- 50 MB
  10000,
  50,
  10737418240,     -- 10 GB
  10737418240,     -- 10 GB
  true, true, false, false,
  now()
),
(
  '22222222-2222-2222-2222-222222222222',
  'business',
  'Business',
  2999,
  2147483648,      -- 2 GB
  NULL,
  NULL,
  2199023255552,   -- 2 TB
  2199023255552,   -- 2 TB
  true, true, true, false,
  now()
);

-- ============================================================
-- 2) TENANT
-- ============================================================
INSERT INTO tenant (tenant_id, slug, name, status, created_dt) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dailypolitics', 'Daily Politics', 'active', now());

-- ============================================================
-- 3) SUBSCRIPTION
-- ============================================================
INSERT INTO subscription (
  subscription_id, tenant_id, plan_id, status,
  current_period_start, current_period_end, external_ref, created_dt
) VALUES
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '22222222-2222-2222-2222-222222222222',
  'active',
  date_trunc('month', now()),
  date_trunc('month', now()) + interval '1 month',
  'stripe_sub_mock_001',
  now()
);

-- ============================================================
-- 4) USERS
-- ============================================================
INSERT INTO app_user (
  user_id, email, display_name, status, email_verified, created_dt
) VALUES
('c1111111-1111-1111-1111-111111111111', 'admin@dailypolitics.com', 'DP Admin', 'active', true, now()),
('c2222222-2222-2222-2222-222222222222', 'editor@dailypolitics.com', 'DP Editor', 'active', true, now()),
('c3333333-3333-3333-3333-333333333333', 'viewer@dailypolitics.com', 'DP Viewer', 'active', false, now());

INSERT INTO tenant_member (tenant_id, user_id, role, created_dt) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1111111-1111-1111-1111-111111111111', 'owner',  now()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c2222222-2222-2222-2222-222222222222', 'admin',  now()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c3333333-3333-3333-3333-333333333333', 'viewer', now());

-- Password auth (PLACEHOLDER HASHES)
INSERT INTO user_auth_password (
  user_id, password_hash, password_algo, password_updated_dt,
  failed_attempts, locked_until, last_login_dt, created_dt
) VALUES
(
  'c1111111-1111-1111-1111-111111111111',
  '$argon2id$v=19$m=65536,t=3,p=1$PLACEHOLDER_SALT$PLACEHOLDER_HASH',
  'argon2id',
  now(),
  0, NULL, now(), now()
),
(
  'c2222222-2222-2222-2222-222222222222',
  '$argon2id$v=19$m=65536,t=3,p=1$PLACEHOLDER_SALT$PLACEHOLDER_HASH',
  'argon2id',
  now(),
  0, NULL, now(), now()
),
(
  'c3333333-3333-3333-3333-333333333333',
  '$argon2id$v=19$m=65536,t=3,p=1$PLACEHOLDER_SALT$PLACEHOLDER_HASH',
  'argon2id',
  now(),
  0, NULL, NULL, now()
);

INSERT INTO email_verification_token (
  token_id, user_id, token_hash, expires_dt, used_dt, created_dt
) VALUES
(
  'd1111111-1111-1111-1111-111111111111',
  'c3333333-3333-3333-3333-333333333333',
  'sha256:PLACEHOLDER_EMAIL_VERIFY_TOKEN_HASH',
  now() + interval '2 days',
  NULL,
  now()
);

INSERT INTO password_reset_token (
  token_id, user_id, token_hash, expires_dt, used_dt, created_dt
) VALUES
(
  'd2222222-2222-2222-2222-222222222222',
  'c2222222-2222-2222-2222-222222222222',
  'sha256:PLACEHOLDER_RESET_TOKEN_HASH',
  now() + interval '1 day',
  NULL,
  now()
);

-- ============================================================
-- 5) STORAGE BACKENDS
-- ============================================================
INSERT INTO storage_backend (
  storage_backend_id, name, provider, delivery, is_enabled, config, created_dt, updated_dt
) VALUES
(
  'e1111111-1111-1111-1111-111111111111',
  'aws-prod-s3-private',
  'aws_s3',
  'cloudfront_signed_url',
  true,
  jsonb_build_object(
    'bucket', 'filesvc-prod',
    'region', 'eu-west-1',
    'cloudfrontDistributionId', 'E123EXAMPLE',
    'oacEnabled', true,
    'kmsKeyId', 'alias/filesvc-kms'
  ),
  now(), now()
),
(
  'e2222222-2222-2222-2222-222222222222',
  'local-baremetal',
  'filesystem',
  'nginx_signed_url',
  false,
  jsonb_build_object(
    'rootPath', '/data/filesvc',
    'baseUrl', 'https://files.example.com'
  ),
  now(), now()
);

-- ============================================================
-- 6) TENANT POLICY
-- ============================================================
INSERT INTO tenant_policy (
  tenant_id, storage_backend_id, key_template,
  presigned_url_ttl_seconds, default_retention_days, av_required,
  allowed_mime_types, default_visibility,
  webhook_url, webhook_secret_hash,
  updated_dt
) VALUES
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'e1111111-1111-1111-1111-111111111111',
  '{tenant}/{integration}/{applicationRefId}/{assetId}/{filename}',
  900,
  365,
  true,
  ARRAY['image/jpeg','image/png','image/webp','video/mp4'],
  'private',
  'https://client-webhook.example.com/filesvc/events',
  'sha256:PLACEHOLDER_WEBHOOK_SECRET_HASH',
  now()
);

-- ============================================================
-- 7) INTEGRATIONS + OVERRIDES
-- ============================================================
INSERT INTO integration (
  integration_id, tenant_id, code, name, status,
  webhook_url, webhook_secret_hash,
  created_dt, updated_dt
) VALUES
(
  'f1111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'cms_ingest',
  'CMS Ingest',
  'active',
  NULL, NULL,
  now(), now()
),
(
  'f2222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'marketing_dam',
  'Marketing DAM',
  'active',
  NULL, NULL,
  now(), now()
);

INSERT INTO integration_policy_override (
  integration_id,
  storage_backend_id,
  key_template,
  presigned_url_ttl_seconds,
  retention_days,
  av_required,
  allowed_mime_types,
  default_visibility,
  max_upload_size_bytes,
  updated_dt
) VALUES
(
  'f1111111-1111-1111-1111-111111111111',
  NULL,
  '{tenant}/{integration}/{documentType}/{assetId}/{filename}',
  600,
  365,
  true,
  ARRAY['image/jpeg','image/png','image/webp'],
  'public',
  20971520,
  now()
),
(
  'f2222222-2222-2222-2222-222222222222',
  NULL,
  '{tenant}/{integration}/{applicationRefId}/{assetId}/{filename}',
  900,
  1825,
  true,
  ARRAY['image/jpeg','image/png','image/webp','video/mp4'],
  'private',
  2147483648,
  now()
);

-- ============================================================
-- 8) API KEYS (valid UUIDs now)
-- ============================================================
INSERT INTO api_key (
  api_key_id, tenant_id, integration_id, name, key_hash, last_used_dt, created_dt, revoked_dt
) VALUES
(
  'a0000000-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'f1111111-1111-1111-1111-111111111111',
  'CMS Key',
  'sha256:PLACEHOLDER_API_KEY_HASH_CMS',
  now(),
  now(),
  NULL
),
(
  'a0000000-0000-0000-0000-000000000002',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'f2222222-2222-2222-2222-222222222222',
  'DAM Key',
  'sha256:PLACEHOLDER_API_KEY_HASH_DAM',
  now(),
  now(),
  NULL
);

-- ============================================================
-- 9) COLLECTIONS
-- ============================================================
INSERT INTO collection (
  collection_id, tenant_id, name, description, created_by, created_dt, updated_dt
) VALUES
(
  'a0000000-0000-0000-0000-000000000101',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Homepage',
  'Assets used on the homepage',
  'c1111111-1111-1111-1111-111111111111',
  now(), now()
),
(
  'a0000000-0000-0000-0000-000000000102',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Video Interviews',
  'Interview clips and promo thumbnails',
  'c2222222-2222-2222-2222-222222222222',
  now(), now()
);

-- ============================================================
-- 10) FILE METADATA (2 assets)
-- ============================================================
INSERT INTO file_metadata (
  file_id, tenant_id, integration_id, storage_backend_id,
  title, description,
  application_ref_id, document_type, document_type_id,
  object_key, storage_uri,
  original_filename, content_type, size_bytes, checksum_sha256,
  retention_days, expires_at, gdpr_flag,
  record_status, record_sub_status, request_count,
  visibility, general_access,
  deleted_at, deleted_by,
  created_by, created_dt, updated_by, updated_dt
) VALUES
(
  'a0000000-0000-0000-0000-000000000201',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'f1111111-1111-1111-1111-111111111111',
  'e1111111-1111-1111-1111-111111111111',
  'Election Header',
  'Homepage header image for election story',
  'ART-1001',
  'hero_image',
  NULL,
  'dailypolitics/cms_ingest/hero_image/a0000000-0000-0000-0000-000000000201/election-header.webp',
  's3://filesvc-prod/dailypolitics/cms_ingest/hero_image/a0000000-0000-0000-0000-000000000201/election-header.webp',
  'election-header.webp',
  'image/webp',
  345678,
  'sha256:PLACEHOLDER_FILE_HASH_1',
  365,
  now() + interval '365 days',
  'false',
  'upload',
  'completed',
  0,
  'public',
  'anyone_with_link',
  NULL, NULL,
  'c2222222-2222-2222-2222-222222222222',
  now(),
  'c2222222-2222-2222-2222-222222222222',
  now()
),
(
  'a0000000-0000-0000-0000-000000000202',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'f2222222-2222-2222-2222-222222222222',
  'e1111111-1111-1111-1111-111111111111',
  'Interview Clip',
  'Short MP4 used for social promo',
  'VID-2009',
  'interview_video',
  NULL,
  'dailypolitics/marketing_dam/VID-2009/a0000000-0000-0000-0000-000000000202/interview.mp4',
  's3://filesvc-prod/dailypolitics/marketing_dam/VID-2009/a0000000-0000-0000-0000-000000000202/interview.mp4',
  'interview.mp4',
  'video/mp4',
  987654321,
  'sha256:PLACEHOLDER_FILE_HASH_2',
  1825,
  now() + interval '1825 days',
  'false',
  'upload',
  'completed',
  0,
  'private',
  'restricted',
  NULL, NULL,
  'c1111111-1111-1111-1111-111111111111',
  now(),
  'c1111111-1111-1111-1111-111111111111',
  now()
);

INSERT INTO collection_asset (collection_id, file_id, created_dt) VALUES
('a0000000-0000-0000-0000-000000000101', 'a0000000-0000-0000-0000-000000000201', now()),
('a0000000-0000-0000-0000-000000000102', 'a0000000-0000-0000-0000-000000000202', now());

-- ============================================================
-- 11) TAGS + ASSET_TAG
-- ============================================================
INSERT INTO tag (tag_id, tenant_id, name, created_dt) VALUES
('a0000000-0000-0000-0000-000000000301', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Politics', now()),
('a0000000-0000-0000-0000-000000000302', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Election', now()),
('a0000000-0000-0000-0000-000000000303', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Interview', now());

INSERT INTO asset_tag (file_id, tag_id, created_dt) VALUES
('a0000000-0000-0000-0000-000000000201', 'a0000000-0000-0000-0000-000000000301', now()),
('a0000000-0000-0000-0000-000000000201', 'a0000000-0000-0000-0000-000000000302', now()),
('a0000000-0000-0000-0000-000000000202', 'a0000000-0000-0000-0000-000000000301', now()),
('a0000000-0000-0000-0000-000000000202', 'a0000000-0000-0000-0000-000000000303', now());

-- ============================================================
-- 12) DERIVATIVES
-- ============================================================
INSERT INTO file_derivative (
  derivative_id, file_id, kind, spec,
  storage_backend_id, object_key, storage_uri, size_bytes, created_dt
) VALUES
(
  'a0000000-0000-0000-0000-000000000401',
  'a0000000-0000-0000-0000-000000000201',
  'thumbnail',
  '{"w":400,"format":"webp"}',
  'e1111111-1111-1111-1111-111111111111',
  'dailypolitics/cms_ingest/hero_image/a0000000-0000-0000-0000-000000000201/thumb-400.webp',
  's3://filesvc-prod/dailypolitics/cms_ingest/hero_image/a0000000-0000-0000-0000-000000000201/thumb-400.webp',
  45678,
  now()
),
(
  'a0000000-0000-0000-0000-000000000402',
  'a0000000-0000-0000-0000-000000000202',
  'poster',
  '{"t":1,"format":"jpg"}',
  'e1111111-1111-1111-1111-111111111111',
  'dailypolitics/marketing_dam/VID-2009/a0000000-0000-0000-0000-000000000202/poster-1s.jpg',
  's3://filesvc-prod/dailypolitics/marketing_dam/VID-2009/a0000000-0000-0000-0000-000000000202/poster-1s.jpg',
  123456,
  now()
);

-- ============================================================
-- 13) EVENTS
-- ============================================================
INSERT INTO file_event (file_id, event_type, detail, actor_user_id, created_dt) VALUES
('a0000000-0000-0000-0000-000000000201', 'UPLOAD_INITIATED', '{"client":"mvc-ui"}', 'c2222222-2222-2222-2222-222222222222', now() - interval '10 minutes'),
('a0000000-0000-0000-0000-000000000201', 'UPLOAD_COMPLETED', '{"verified":true}', 'c2222222-2222-2222-2222-222222222222', now() - interval '9 minutes'),
('a0000000-0000-0000-0000-000000000201', 'VIEWED', '{"via":"cloudfront"}', 'c3333333-3333-3333-3333-333333333333', now() - interval '2 minutes'),
('a0000000-0000-0000-0000-000000000202', 'UPLOAD_COMPLETED', '{"verified":true}', 'c1111111-1111-1111-1111-111111111111', now() - interval '1 hour');

-- ============================================================
-- 14) SHARE LINK
-- ============================================================
INSERT INTO share_link (
  share_id, tenant_id, file_id, token_hash, expires_dt,
  password_hash, created_by, created_dt, revoked_dt
) VALUES
(
  'a0000000-0000-0000-0000-000000000501',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'a0000000-0000-0000-0000-000000000201',
  'sha256:PLACEHOLDER_SHARE_TOKEN_HASH',
  now() + interval '7 days',
  NULL,
  'c2222222-2222-2222-2222-222222222222',
  now(),
  NULL
);

-- ============================================================
-- 15) GROUPS + MEMBERS
-- ============================================================
INSERT INTO user_group (group_id, tenant_id, name, created_dt) VALUES
('a0000000-0000-0000-0000-000000000601', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Editors', now()),
('a0000000-0000-0000-0000-000000000602', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Viewers', now());

INSERT INTO user_group_member (group_id, user_id, created_dt) VALUES
('a0000000-0000-0000-0000-000000000601', 'c1111111-1111-1111-1111-111111111111', now()),
('a0000000-0000-0000-0000-000000000601', 'c2222222-2222-2222-2222-222222222222', now()),
('a0000000-0000-0000-0000-000000000602', 'c3333333-3333-3333-3333-333333333333', now());

-- ============================================================
-- 16) FILE PERMISSIONS
-- ============================================================
INSERT INTO file_permission (
  tenant_id, file_id, user_id, group_id, role, created_by, created_dt
) VALUES
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'a0000000-0000-0000-0000-000000000202',
  'c1111111-1111-1111-1111-111111111111',
  NULL,
  'owner',
  'c1111111-1111-1111-1111-111111111111',
  now()
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'a0000000-0000-0000-0000-000000000202',
  NULL,
  'a0000000-0000-0000-0000-000000000601',
  'viewer',
  'c1111111-1111-1111-1111-111111111111',
  now()
);

-- ============================================================
-- 17) USAGE
-- ============================================================
INSERT INTO usage_daily (
  tenant_id, day,
  storage_bytes, egress_bytes,
  uploads_count, downloads_count, transforms_count
) VALUES
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  current_date,
  987654321 + 345678,
  123456789,
  2,
  5,
  2
);

COMMIT;