ALTER TABLE public.file_derivative
ADD COLUMN processing_started_dt timestamptz,
ADD COLUMN updated_dt timestamptz DEFAULT now() NOT NULL;

ALTER TABLE ONLY public.file_derivative
    ADD CONSTRAINT file_derivative_attempts_nonnegative
    CHECK (attempts >= 0);

CREATE INDEX idx_file_derivative_file_ready
  ON public.file_derivative (file_id, kind)
  WHERE status = 'ready';

ALTER TABLE ONLY public.file_derivative
  ADD CONSTRAINT file_derivative_object_key_not_empty
  CHECK (length(btrim(object_key)) > 0);

ALTER TABLE ONLY public.file_derivative
  ADD CONSTRAINT file_derivative_storage_location_key
  UNIQUE (storage_backend_id, object_key);