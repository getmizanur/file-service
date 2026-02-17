-- 1) Tenant integrity is not enforced

-- Right now both share_link and file_permission have separate FKs to:
-- 	tenant_id → tenant
-- 	file_id → file_metadata(file_id)

-- That allows a bad row where:
-- 	tenant_id = Tenant A
-- 	file_id belongs to Tenant B

-- Your schema already has this in file_metadata:
-- 	UNIQUE (tenant_id, file_id) (named uq_file_metadata_tenant_file)

ALTER TABLE public.file_permission
  ADD CONSTRAINT file_permission_tenant_file_fkey
  FOREIGN KEY (tenant_id, file_id)
  REFERENCES public.file_metadata (tenant_id, file_id)
  ON DELETE CASCADE;

ALTER TABLE public.share_link
  ADD CONSTRAINT share_link_tenant_file_fkey
  FOREIGN KEY (tenant_id, file_id)
  REFERENCES public.file_metadata (tenant_id, file_id)
  ON DELETE CASCADE;