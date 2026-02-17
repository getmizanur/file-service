-- 2) You have uniqueness for user permissions, but not for group permissions

-- You enforce uniqueness for user grants:
-- 	UNIQUE (tenant_id, file_id, user_id)

-- …but there’s no equivalent for groups, so you can insert duplicates like:
-- 	same (tenant_id, file_id, group_id) multiple times

-- Partial unique index for group permissions
CREATE UNIQUE INDEX uq_file_permission_group
ON public.file_permission (tenant_id, file_id, group_id)
WHERE group_id IS NOT NULL;

-- Partial unique index for user permissions
CREATE UNIQUE INDEX uq_file_permission_user_not_null
ON public.file_permission (tenant_id, file_id, user_id)
WHERE user_id IS NOT NULL;