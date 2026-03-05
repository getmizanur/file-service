-- 028_update_allowed_mime_types.sql
-- Expand allowed_mime_types to support all Google-indexable file types
-- Reference: https://developers.google.com/search/docs/crawling-indexing/indexable-file-types

UPDATE public.tenant_policy
SET allowed_mime_types = ARRAY[
  -- Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  'image/avif',

  -- Video
  'video/mp4',
  'video/3gpp',
  'video/3gpp2',
  'video/x-ms-asf',
  'video/x-msvideo',
  'video/divx',
  'video/mpeg',
  'video/x-matroska',
  'video/quicktime',
  'video/ogg',
  'video/webm',
  'video/x-ms-wmv',
  'video/x-m4v',

  -- Documents
  'application/pdf',
  'application/postscript',
  'application/epub+zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'application/rtf',

  -- Text / Markup
  'text/csv',
  'text/plain',
  'text/html',
  'text/xml',
  'application/xml',

  -- Geo / Specialist
  'application/vnd.google-earth.kml+xml',
  'application/vnd.google-earth.kmz',
  'application/gpx+xml',
  'application/x-tex'
];
