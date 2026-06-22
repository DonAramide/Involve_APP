-- Drop old empty activations table if it exists
DROP TABLE IF EXISTS public.activations CASCADE;

-- Create device_activations table conforming to P0-2 requirements
CREATE TABLE IF NOT EXISTS public.device_activations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activation_code VARCHAR(20) UNIQUE NOT NULL,
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    duration_days   INTEGER NOT NULL DEFAULT 30,
    plan_index      INTEGER DEFAULT 0,
    device_suffix   VARCHAR(20) DEFAULT '0',
    device_id       TEXT, -- Nullable initially, holds device_id upon redemption
    status          VARCHAR(20) DEFAULT 'pending', -- 'pending', 'used', 'expired'
    is_used         BOOLEAN DEFAULT FALSE,
    created_by      TEXT NOT NULL, -- Email of the creator
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    used_at         TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ NOT NULL -- Expiration timestamp calculated at creation
);

-- Enable RLS and add policy
ALTER TABLE public.device_activations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.device_activations FOR ALL TO service_role USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_activations_code ON public.device_activations(activation_code);
CREATE INDEX IF NOT EXISTS idx_device_activations_tenant ON public.device_activations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_activations_device ON public.device_activations(device_id);
