-- Self-serve signups and admin edits store a plan expiry.
-- NULL means permanent (no expiry).
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

COMMENT ON COLUMN public.tenants.plan_expires_at IS
  'When the current subscription plan expires. NULL means permanent / no expiry.';
