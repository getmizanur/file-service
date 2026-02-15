ALTER TABLE file_permission
ADD CONSTRAINT uq_file_permission_user
UNIQUE (tenant_id, file_id, user_id);

ALTER TABLE share_link
ADD COLUMN role public.file_permission_role NOT NULL DEFAULT 'viewer';
