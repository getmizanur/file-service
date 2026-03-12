CREATE TABLE IF NOT EXISTS public.storage_cleanup_queue (
  cleanup_id         bigserial    PRIMARY KEY,
  storage_backend_id uuid         NOT NULL,
  object_key         text         NOT NULL,
  reason             text         NOT NULL,
  detected_dt        timestamptz  NOT NULL DEFAULT now(),
  delete_after_dt    timestamptz  NOT NULL,
  deleted_dt         timestamptz,
  status             text         NOT NULL DEFAULT 'pending',

  CONSTRAINT chk_storage_cleanup_status CHECK (status IN ('pending', 'deleted', 'failed')),
  -- Prevents double-queueing the same object key on the same backend
  CONSTRAINT uq_storage_cleanup_pending UNIQUE (storage_backend_id, object_key)
);

-- Fast lookup: find deletable rows by backend + status + due date
CREATE INDEX IF NOT EXISTS idx_storage_cleanup_due
  ON public.storage_cleanup_queue (status, delete_after_dt)
  WHERE status = 'pending';

COMMENT ON TABLE public.storage_cleanup_queue IS
  'Two-stage orphan cleanup queue. Detect job inserts candidates; delete job removes them after grace period.';