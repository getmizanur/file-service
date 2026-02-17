-- Add public_key column if not exists
ALTER TABLE file_metadata
ADD COLUMN IF NOT EXISTS public_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_file_metadata_public_key
ON file_metadata (public_key)
WHERE public_key IS NOT NULL;
