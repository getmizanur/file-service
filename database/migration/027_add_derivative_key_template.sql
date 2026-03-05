-- 027_add_derivative_key_template.sql
-- Add derivative_key_template column to tenant_policy for per-tenant derivative path control

ALTER TABLE public.tenant_policy
  ADD COLUMN derivative_key_template TEXT
  DEFAULT 'tenants/{tenant_id}/derivatives/{file_id}/{kind}_{spec}.{ext}';

-- Backfill existing rows with the default template
UPDATE public.tenant_policy
  SET derivative_key_template = 'tenants/{tenant_id}/derivatives/{file_id}/{kind}_{spec}.{ext}'
  WHERE derivative_key_template IS NULL;
