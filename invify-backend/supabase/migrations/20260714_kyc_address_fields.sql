-- Add address fields to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS lga text,
ADD COLUMN IF NOT EXISTS street_address text;
