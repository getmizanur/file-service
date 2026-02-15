ALTER TABLE folder_permission
ADD CONSTRAINT uq_folder_permission_user UNIQUE (tenant_id, folder_id, user_id);