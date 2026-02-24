ALTER TABLE public.usage_daily
ADD CONSTRAINT usage_daily_pkey PRIMARY KEY (tenant_id, day);

CREATE INDEX idx_usage_daily_tenant_day ON public.usage_daily USING btree (tenant_id, day DESC);

ALTER TABLE ONLY public.usage_daily
    ADD CONSTRAINT usage_daily_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id) ON DELETE CASCADE;

ALTER TABLE public.usage_daily
DROP COLUMN usage_id;