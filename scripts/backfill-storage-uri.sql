-- scripts/backfill-storage-uri.sql
-- One-time script to populate storage_uri for existing file_metadata and
-- file_derivative rows where storage_uri is NULL.
--
-- Usage:  psql -d <database> -f scripts/backfill-storage-uri.sql
--
-- Logic per provider:
--   aws_s3  : s3://<bucket>/<prefix>/<object_key>
--   local_fs: file://<root_path>/<object_key>
--
-- Prefix cleanup: "/tenant-uploads/*" → "tenant-uploads/"
--   1. strip leading slashes
--   2. strip trailing /* or *
--   3. append trailing slash (if prefix is non-empty)

BEGIN;

-- 1. Backfill file_metadata.storage_uri
UPDATE public.file_metadata fm
SET storage_uri = CASE
  WHEN sb.provider = 'aws_s3' THEN
    's3://' || (sb.config->>'bucket') || '/' ||
    CASE
      WHEN COALESCE(sb.config->>'prefix', '') != ''
      THEN regexp_replace(
             regexp_replace(
               regexp_replace(sb.config->>'prefix', '^/+', ''),
             '/?\*$', ''),
           '/+$', '') || '/'
      ELSE ''
    END ||
    fm.object_key
  WHEN sb.provider = 'local_fs' THEN
    'file://' || COALESCE(sb.config->>'root_path', './storage') || '/' || fm.object_key
  ELSE NULL
END
FROM public.storage_backend sb
WHERE sb.storage_backend_id = fm.storage_backend_id
  AND fm.storage_uri IS NULL;

-- 2. Backfill file_derivative.storage_uri
UPDATE public.file_derivative fd
SET storage_uri = CASE
  WHEN sb.provider = 'aws_s3' THEN
    's3://' || (sb.config->>'bucket') || '/' ||
    CASE
      WHEN COALESCE(sb.config->>'prefix', '') != ''
      THEN regexp_replace(
             regexp_replace(
               regexp_replace(sb.config->>'prefix', '^/+', ''),
             '/?\*$', ''),
           '/+$', '') || '/'
      ELSE ''
    END ||
    fd.object_key
  WHEN sb.provider = 'local_fs' THEN
    'file://' || COALESCE(sb.config->>'root_path', './storage') || '/' || fd.object_key
  ELSE NULL
END
FROM public.storage_backend sb
WHERE sb.storage_backend_id = fd.storage_backend_id
  AND (fd.storage_uri IS NULL OR fd.storage_uri = '');

COMMIT;
