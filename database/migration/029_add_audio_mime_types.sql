-- 029_add_audio_mime_types.sql
-- Add audio MIME types to allowed_mime_types

UPDATE public.tenant_policy
SET allowed_mime_types = array_cat(allowed_mime_types, ARRAY[
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/mp4',
  'audio/webm',
  'audio/x-ms-wma'
]);
