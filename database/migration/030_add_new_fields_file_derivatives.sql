-- Status values
-- pending - job created but not started
-- processing - worker is generating derivative
-- ready - thumbnail successfully generated
-- failed - generation failed
-- skipped - generation intentionally skipped


ALTER TABLE public.file_derivative
ADD COLUMN status text NOT NULL DEFAULT 'pending',
ADD COLUMN error_detail text,
ADD COLUMN attempts integer NOT NULL DEFAULT 0,
ADD COLUMN last_attempt_dt timestamptz,
ADD COLUMN ready_dt timestamptz;

ALTER TABLE public.file_derivative
ADD CONSTRAINT chk_file_derivative_status
CHECK (
  status IN (
    'pending',
    'processing',
    'ready',
    'failed',
    'skipped'
  )
);

CREATE INDEX idx_file_derivative_status_pending
ON public.file_derivative (status, created_dt)
WHERE status IN ('pending', 'failed');

-- Existing derivatives were already generated successfully before this migration.
-- Mark them as 'ready' so they remain serveable by status-filtered queries.
UPDATE public.file_derivative
SET status = 'ready', ready_dt = created_dt
WHERE status = 'pending';
