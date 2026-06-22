-- Create subscription_events table conforming to P0-3 requirements
CREATE TABLE IF NOT EXISTS public.subscription_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    event_type      VARCHAR(20) NOT NULL, -- 'CREATED', 'EXTENDED', 'UPGRADED', 'DOWNGRADED', 'SUSPENDED', 'EXPIRED'
    days_added      INTEGER DEFAULT 0,
    performed_by    TEXT NOT NULL, -- Email of the operator/admin
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and add policy
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.subscription_events FOR ALL TO service_role USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_events_sub ON public.subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_tenant ON public.subscription_events(tenant_id);
