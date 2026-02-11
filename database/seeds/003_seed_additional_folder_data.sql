-- ============================================================
-- Additional folders + files (IDEMPOTENT)
-- Safe to run multiple times
-- ============================================================

-- If you previously hit "current transaction is aborted"
-- ROLLBACK;

-- ============================================================
-- 1) FOLDERS (Root -> Level 1 -> Level 2)
-- ============================================================

-- Root: Media
INSERT INTO folder (folder_id, tenant_id, parent_folder_id, name, created_by)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  NULL,
  'Media',
  'c1111111-1111-1111-1111-111111111111'
)
ON CONFLICT (folder_id) DO NOTHING;

-- Level 1 under Media
INSERT INTO folder (folder_id, tenant_id, parent_folder_id, name, created_by)
VALUES
('a1000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1000000-0000-0000-0000-000000000001', 'Images',           'c1111111-1111-1111-1111-111111111111'),
('a1000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1000000-0000-0000-0000-000000000001', 'Videos',           'c1111111-1111-1111-1111-111111111111'),
('a1000000-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1000000-0000-0000-0000-000000000001', 'Marketing Assets', 'c1111111-1111-1111-1111-111111111111'),
('a1000000-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1000000-0000-0000-0000-000000000001', 'Documents',        'c1111111-1111-1111-1111-111111111111')
ON CONFLICT (folder_id) DO NOTHING;

-- Level 2 under Images / Videos
INSERT INTO folder (folder_id, tenant_id, parent_folder_id, name, created_by)
VALUES
('a1000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1000000-0000-0000-0000-000000000002', 'Elections',        'c2222222-2222-2222-2222-222222222222'),
('a1000000-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1000000-0000-0000-0000-000000000002', 'Campaign Posters', 'c2222222-2222-2222-2222-222222222222'),
('a1000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1000000-0000-0000-0000-000000000003', 'Interviews',       'c2222222-2222-2222-2222-222222222222'),
('a1000000-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1000000-0000-0000-0000-000000000003', 'Debates',          'c2222222-2222-2222-2222-222222222222')
ON CONFLICT (folder_id) DO NOTHING;

-- ============================================================
-- 2) FILES (Idempotent)
--    Ensures required NOT NULL columns:
--      - document_type
--      - object_key
--      - original_filename
-- ============================================================

-- Elections images
INSERT INTO file_metadata (
  file_id,
  tenant_id,
  integration_id,
  storage_backend_id,
  folder_id,
  title,
  description,
  application_ref_id,
  document_type,
  object_key,
  storage_uri,
  original_filename,
  content_type,
  size_bytes,
  record_status,
  record_sub_status,
  visibility,
  general_access,
  created_by,
  created_dt,
  updated_by,
  updated_dt
) VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'f1111111-1111-1111-1111-111111111111',
  'e1111111-1111-1111-1111-111111111111',
  'a1000000-0000-0000-0000-000000000004',
  'Election Night Crowd',
  'Crowd image from election night coverage',
  'ART-2001',
  'image',
  'dailypolitics/cms_ingest/images/elections/b0000000-0000-0000-0000-000000000001/election-night.jpg',
  's3://filesvc-prod/dailypolitics/cms_ingest/images/elections/b0000000-0000-0000-0000-000000000001/election-night.jpg',
  'election-night.jpg',
  'image/jpeg',
  345678,
  'upload',
  'completed',
  'public',
  'anyone_with_link',
  'c2222222-2222-2222-2222-222222222222',
  now(),
  'c2222222-2222-2222-2222-222222222222',
  now()
),
(
  'b0000000-0000-0000-0000-000000000002',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'f1111111-1111-1111-1111-111111111111',
  'e1111111-1111-1111-1111-111111111111',
  'a1000000-0000-0000-0000-000000000004',
  'Vote Counting',
  'Vote count screenshot used in article',
  'ART-2002',
  'image',
  'dailypolitics/cms_ingest/images/elections/b0000000-0000-0000-0000-000000000002/vote-counting.png',
  's3://filesvc-prod/dailypolitics/cms_ingest/images/elections/b0000000-0000-0000-0000-000000000002/vote-counting.png',
  'vote-counting.png',
  'image/png',
  456789,
  'upload',
  'completed',
  'private',
  'restricted',
  'c2222222-2222-2222-2222-222222222222',
  now(),
  'c2222222-2222-2222-2222-222222222222',
  now()
)
ON CONFLICT (file_id) DO NOTHING;

-- Also guard against re-inserts where file_id differs but object_key is same:
-- if your schema has UNIQUE (tenant_id, storage_backend_id, object_key),
-- this will prevent duplicates by object_key too.
-- (Postgres only allows one ON CONFLICT target. We chose PK above.
-- If you prefer the object_key uniqueness as the conflict target, use the alternative below.)

-- Campaign poster
INSERT INTO file_metadata (
  file_id, tenant_id, integration_id, storage_backend_id,
  folder_id, title, description, application_ref_id,
  document_type, object_key, storage_uri,
  original_filename, content_type, size_bytes,
  record_status, record_sub_status,
  visibility, general_access,
  created_by, created_dt, updated_by, updated_dt
) VALUES
(
  'b0000000-0000-0000-0000-000000000003',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'f1111111-1111-1111-1111-111111111111',
  'e1111111-1111-1111-1111-111111111111',
  'a1000000-0000-0000-0000-000000000008',
  'Campaign Poster 2026',
  'Final approved campaign poster',
  'MKT-3001',
  'image',
  'dailypolitics/cms_ingest/images/campaign-posters/b0000000-0000-0000-0000-000000000003/poster-2026.webp',
  's3://filesvc-prod/dailypolitics/cms_ingest/images/campaign-posters/b0000000-0000-0000-0000-000000000003/poster-2026.webp',
  'poster-2026.webp',
  'image/webp',
  223344,
  'upload',
  'completed',
  'public',
  'anyone_with_link',
  'c1111111-1111-1111-1111-111111111111',
  now(),
  'c1111111-1111-1111-1111-111111111111',
  now()
)
ON CONFLICT (file_id) DO NOTHING;

-- Interviews video
INSERT INTO file_metadata (
  file_id, tenant_id, integration_id, storage_backend_id,
  folder_id, title, description, application_ref_id,
  document_type, object_key, storage_uri,
  original_filename, content_type, size_bytes,
  record_status, record_sub_status,
  visibility, general_access,
  created_by, created_dt, updated_by, updated_dt
) VALUES
(
  'b0000000-0000-0000-0000-000000000004',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'f2222222-2222-2222-2222-222222222222',
  'e1111111-1111-1111-1111-111111111111',
  'a1000000-0000-0000-0000-000000000005',
  'Prime Minister Interview',
  'Short interview clip',
  'VID-4001',
  'video',
  'dailypolitics/marketing_dam/videos/interviews/b0000000-0000-0000-0000-000000000004/pm-interview.mp4',
  's3://filesvc-prod/dailypolitics/marketing_dam/videos/interviews/b0000000-0000-0000-0000-000000000004/pm-interview.mp4',
  'pm-interview.mp4',
  'video/mp4',
  150000000,
  'upload',
  'completed',
  'private',
  'restricted',
  'c1111111-1111-1111-1111-111111111111',
  now(),
  'c1111111-1111-1111-1111-111111111111',
  now()
)
ON CONFLICT (file_id) DO NOTHING;

-- Debates video (Leaders Debate Full)
INSERT INTO file_metadata (
  file_id, tenant_id, integration_id, storage_backend_id,
  folder_id, title, description, application_ref_id,
  document_type, object_key, storage_uri,
  original_filename, content_type, size_bytes,
  record_status, record_sub_status,
  visibility, general_access,
  created_by, created_dt, updated_by, updated_dt
) VALUES
(
  'b0000000-0000-0000-0000-000000000005',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'f2222222-2222-2222-2222-222222222222',
  'e1111111-1111-1111-1111-111111111111',
  'a1000000-0000-0000-0000-000000000009',
  'Leaders Debate Full',
  'Full-length leaders debate recording',
  'VID-4002',
  'video',
  'dailypolitics/marketing_dam/videos/debates/b0000000-0000-0000-0000-000000000005/leaders-debate.mp4',
  's3://filesvc-prod/dailypolitics/marketing_dam/videos/debates/b0000000-0000-0000-0000-000000000005/leaders-debate.mp4',
  'leaders-debate.mp4',
  'video/mp4',
  280000000,
  'upload',
  'completed',
  'private',
  'restricted',
  'c2222222-2222-2222-2222-222222222222',
  now(),
  'c2222222-2222-2222-2222-222222222222',
  now()
)
ON CONFLICT (file_id) DO NOTHING;

-- ============================================================
-- END
-- ============================================================