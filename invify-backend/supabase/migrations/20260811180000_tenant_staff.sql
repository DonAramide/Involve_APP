-- Tenant POS staff roster + personal salary bank (synced from Flutter app)
CREATE TABLE IF NOT EXISTS public.tenant_staff (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  staff_id TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'STAFF',
  is_active BOOLEAN NOT NULL DEFAULT true,
  bank_name TEXT,
  bank_code TEXT,
  account_number TEXT,
  account_name TEXT,
  virtual_account_number TEXT,
  virtual_account_bank TEXT,
  virtual_account_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_staff_tenant
  ON public.tenant_staff (tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_staff_active
  ON public.tenant_staff (tenant_id, is_active);
