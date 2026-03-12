CREATE TABLE public.user_suggestion_cache (
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    asset_type text NOT NULL CHECK (asset_type IN ('file', 'folder')),
    asset_id uuid NOT NULL,
    score numeric NOT NULL DEFAULT 0,
    reason jsonb DEFAULT '{}'::jsonb NOT NULL,
    generated_dt timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT user_suggestion_cache_pkey
        PRIMARY KEY (tenant_id, user_id, asset_type, asset_id)
);

ALTER TABLE public.user_suggestion_cache
ADD CONSTRAINT user_suggestion_cache_tenant_fk
FOREIGN KEY (tenant_id)
REFERENCES public.tenant (tenant_id)
ON DELETE CASCADE;

ALTER TABLE public.user_suggestion_cache
ADD CONSTRAINT user_suggestion_cache_user_fk
FOREIGN KEY (user_id)
REFERENCES public.app_user (user_id)
ON DELETE CASCADE;

CREATE INDEX idx_user_suggestion_cache_user
ON public.user_suggestion_cache (tenant_id, user_id);

CREATE INDEX idx_user_suggestion_cache_score
ON public.user_suggestion_cache (tenant_id, user_id, score DESC);

CREATE INDEX idx_user_suggestion_cache_generated
ON public.user_suggestion_cache (generated_dt DESC);