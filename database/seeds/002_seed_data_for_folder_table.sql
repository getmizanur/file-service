-- ============================================================
-- FOLDERS (hierarchical seed data)
-- ============================================================

INSERT INTO folder (
  folder_id,
  tenant_id,
  parent_folder_id,
  name,
  created_by,
  created_dt
) VALUES
-- Root folder
(
  'a1000000-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  NULL,
  'Media',
  'c1111111-1111-1111-1111-111111111111',
  now()
),

-- Level 1
(
  'a1000000-0000-0000-0000-000000000002',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'a1000000-0000-0000-0000-000000000001',
  'Images',
  'c1111111-1111-1111-1111-111111111111',
  now()
),
(
  'a1000000-0000-0000-0000-000000000003',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'a1000000-0000-0000-0000-000000000001',
  'Videos',
  'c1111111-1111-1111-1111-111111111111',
  now()
),

-- Level 2
(
  'a1000000-0000-0000-0000-000000000004',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'a1000000-0000-0000-0000-000000000002',
  'Elections',
  'c2222222-2222-2222-2222-222222222222',
  now()
),
(
  'a1000000-0000-0000-0000-000000000005',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'a1000000-0000-0000-0000-000000000003',
  'Interviews',
  'c2222222-2222-2222-2222-222222222222',
  now()
);


-- ============================================================
-- UPDATE existing files to belong to folders
-- ============================================================

-- Election Header image
UPDATE file_metadata
SET folder_id = 'a1000000-0000-0000-0000-000000000004'
WHERE file_id = 'a0000000-0000-0000-0000-000000000201';

-- Interview Clip video
UPDATE file_metadata
SET folder_id = 'a1000000-0000-0000-0000-000000000005'
WHERE file_id = 'a0000000-0000-0000-0000-000000000202';