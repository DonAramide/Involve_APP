-- Tenant device system-access recovery password (generated from super-admin dashboard).
-- Devices pull this via terminal sync / socket and use it when the local system password is forgotten.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS system_access_password TEXT;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS system_access_password_updated_at TIMESTAMPTZ;
