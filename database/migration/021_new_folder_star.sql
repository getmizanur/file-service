-- application/database/migration/021_new_folder_star.sql

CREATE TABLE folder_star (
  tenant_id   uuid NOT NULL,
  folder_id   uuid NOT NULL,
  user_id     uuid NOT NULL,
  created_dt  timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (tenant_id, folder_id, user_id),

  FOREIGN KEY (folder_id)
    REFERENCES folder (folder_id)
    ON DELETE CASCADE,

  FOREIGN KEY (user_id)
    REFERENCES app_user (user_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_folder_star_user
ON folder_star (tenant_id, user_id, created_dt DESC);