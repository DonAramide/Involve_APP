-- Service-mode jobs, customers, and payments for the tenant dashboard.

CREATE TABLE IF NOT EXISTS public.services_customers (
    id          TEXT PRIMARY KEY,
    tenant_id   UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    school_id   UUID,
    name        TEXT NOT NULL,
    phone       TEXT,
    email       TEXT,
    address     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.services_jobs (
    id              TEXT PRIMARY KEY,
    tenant_id       UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    school_id       UUID,
    job_id          TEXT,
    customer_id     TEXT,
    customer_name   TEXT,
    title           TEXT NOT NULL DEFAULT 'Service job',
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',
    total_amount    NUMERIC(14, 2) NOT NULL DEFAULT 0,
    amount_paid     NUMERIC(14, 2) NOT NULL DEFAULT 0,
    labor_amount    NUMERIC(14, 2) NOT NULL DEFAULT 0,
    balance         NUMERIC(14, 2) NOT NULL DEFAULT 0,
    due_date        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.services_payments (
    id          TEXT PRIMARY KEY,
    tenant_id   UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    school_id   UUID,
    job_id      TEXT,
    amount      NUMERIC(14, 2) NOT NULL DEFAULT 0,
    method      TEXT,
    reference   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_jobs_tenant ON public.services_jobs (tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_jobs_school ON public.services_jobs (school_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_customers_tenant ON public.services_customers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_payments_tenant ON public.services_payments (tenant_id);

ALTER TABLE public.services_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS services_customers_service_all ON public.services_customers;
CREATE POLICY services_customers_service_all
    ON public.services_customers FOR ALL
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS services_jobs_service_all ON public.services_jobs;
CREATE POLICY services_jobs_service_all
    ON public.services_jobs FOR ALL
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS services_payments_service_all ON public.services_payments;
CREATE POLICY services_payments_service_all
    ON public.services_payments FOR ALL
    USING (true) WITH CHECK (true);
