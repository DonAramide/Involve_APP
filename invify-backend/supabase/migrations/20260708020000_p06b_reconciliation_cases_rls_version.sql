-- Add optimistic concurrency versioning
ALTER TABLE public.reconciliation_cases
ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

-- Enable RLS on both tables
ALTER TABLE public.reconciliation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_timeline ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent setup)
DROP POLICY IF EXISTS "Reconciliation cases are isolated per tenant" ON public.reconciliation_cases;
DROP POLICY IF EXISTS "Reconciliation cases insert isolated per tenant" ON public.reconciliation_cases;
DROP POLICY IF EXISTS "Reconciliation cases update isolated per tenant" ON public.reconciliation_cases;
DROP POLICY IF EXISTS "Reconciliation cases delete isolated per tenant" ON public.reconciliation_cases;

DROP POLICY IF EXISTS "Reconciliation timeline isolated per tenant" ON public.reconciliation_timeline;
DROP POLICY IF EXISTS "Reconciliation timeline insert isolated per tenant" ON public.reconciliation_timeline;
DROP POLICY IF EXISTS "Reconciliation timeline update isolated per tenant" ON public.reconciliation_timeline;
DROP POLICY IF EXISTS "Reconciliation timeline delete isolated per tenant" ON public.reconciliation_timeline;

-- Create policies for reconciliation_cases
CREATE POLICY "Reconciliation cases are isolated per tenant"
ON public.reconciliation_cases
FOR SELECT
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenantId')::uuid);

CREATE POLICY "Reconciliation cases insert isolated per tenant"
ON public.reconciliation_cases
FOR INSERT
WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenantId')::uuid);

CREATE POLICY "Reconciliation cases update isolated per tenant"
ON public.reconciliation_cases
FOR UPDATE
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenantId')::uuid);

CREATE POLICY "Reconciliation cases delete isolated per tenant"
ON public.reconciliation_cases
FOR DELETE
USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenantId')::uuid);

-- Create policies for reconciliation_timeline (inherits isolation from parent case)
CREATE POLICY "Reconciliation timeline isolated per tenant"
ON public.reconciliation_timeline
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.reconciliation_cases c 
    WHERE c.id = case_id AND c.tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenantId')::uuid
));

CREATE POLICY "Reconciliation timeline insert isolated per tenant"
ON public.reconciliation_timeline
FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.reconciliation_cases c 
    WHERE c.id = case_id AND c.tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenantId')::uuid
));

CREATE POLICY "Reconciliation timeline update isolated per tenant"
ON public.reconciliation_timeline
FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.reconciliation_cases c 
    WHERE c.id = case_id AND c.tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenantId')::uuid
));

CREATE POLICY "Reconciliation timeline delete isolated per tenant"
ON public.reconciliation_timeline
FOR DELETE
USING (EXISTS (
    SELECT 1 FROM public.reconciliation_cases c 
    WHERE c.id = case_id AND c.tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenantId')::uuid
));
