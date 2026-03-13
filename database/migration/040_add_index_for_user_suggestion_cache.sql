CREATE INDEX IF NOT EXISTS idx_user_suggestion_cache_lookup
ON user_suggestion_cache (tenant_id, user_id, generated_dt DESC);