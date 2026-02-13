ALTER TABLE file_metadata
ADD CONSTRAINT uq_file_metadata_tenant_file
UNIQUE (tenant_id, file_id);

CREATE TABLE file_star (
  tenant_id uuid NOT NULL,
  file_id   uuid NOT NULL,
  user_id   uuid NOT NULL,
  created_dt timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, file_id, user_id),
  FOREIGN KEY (tenant_id, file_id)
    REFERENCES file_metadata (tenant_id, file_id)
    ON DELETE CASCADE,
  FOREIGN KEY (user_id)
    REFERENCES app_user (user_id)
    ON DELETE CASCADE
);

CREATE INDEX idx_file_star_user
ON file_star (tenant_id, user_id, created_dt DESC);