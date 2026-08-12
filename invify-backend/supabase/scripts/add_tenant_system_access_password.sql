-- Quick apply: tenant system access recovery password column
-- Run in Supabase SQL Editor if migration not applied yet.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS system_access_password TEXT;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS system_access_password_updated_at TIMESTAMPTZ;
