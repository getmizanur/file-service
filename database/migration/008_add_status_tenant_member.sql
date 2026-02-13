ALTER TABLE tenant_member
ADD COLUMN status text NOT NULL DEFAULT 'active'
CHECK (status IN ('active','invited','pending','suspended','removed'));

-- Add index for faster lookups of active members
CREATE INDEX idx_tenant_member_active
ON tenant_member (tenant_id, user_id)
WHERE status = 'active';
