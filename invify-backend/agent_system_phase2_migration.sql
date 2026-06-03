-- ==========================================
-- INVIFY AGENT PORTAL - MILESTONE 2 MIGRATION
-- Supabase PostgreSQL Schema: Leads & Tenants (Revised)
-- ==========================================

-- 0. CLEANUP (Idempotency for Dev)
DROP TABLE IF EXISTS public.lead_conversion_logs CASCADE;
DROP TABLE IF EXISTS public.lead_assignment_history CASCADE;
DROP TABLE IF EXISTS public.tenant_activation_progress CASCADE;
DROP TABLE IF EXISTS public.tenant_activation_logs CASCADE;
DROP TABLE IF EXISTS public.agent_tenants CASCADE;
DROP TABLE IF EXISTS public.lead_attachments CASCADE;
DROP TABLE IF EXISTS public.lead_activities CASCADE;
DROP TABLE IF EXISTS public.lead_notes CASCADE;
DROP TABLE IF EXISTS public.agent_leads CASCADE;
DROP TABLE IF EXISTS public.lead_pipelines CASCADE;

-- 1. ENUMS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status_enum') THEN
        CREATE TYPE lead_status_enum AS ENUM ('NEW', 'CONTACTED', 'INTERESTED', 'DOCUMENTS_PENDING', 'ONBOARDING', 'ACTIVATED', 'REJECTED', 'LOST');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_status_enum') THEN
        CREATE TYPE tenant_status_enum AS ENUM ('ONBOARDING', 'ACTIVE', 'SUSPENDED', 'CHURNED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activation_stage_enum') THEN
        CREATE TYPE activation_stage_enum AS ENUM ('REGISTRATION', 'KYC_PENDING', 'KYC_APPROVED', 'TERMINAL_ASSIGNED', 'TERMINAL_DEPLOYED', 'TRAINING_COMPLETED', 'FIRST_TRANSACTION', 'FULLY_ACTIVATED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type_enum') THEN
        CREATE TYPE activity_type_enum AS ENUM ('CALL', 'EMAIL', 'MEETING', 'SITE_VISIT', 'STATUS_CHANGE', 'OTHER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attachment_category_enum') THEN
        CREATE TYPE attachment_category_enum AS ENUM ('ID_CARD', 'BUSINESS_REGISTRATION', 'UTILITY_BILL', 'CONTRACT', 'OTHER');
    END IF;
END$$;

-- 2. PIPELINE KANBAN
CREATE TABLE IF NOT EXISTS public.lead_pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    stage_order INTEGER NOT NULL,
    color_code VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LEADS (Agent CRM)
CREATE TABLE IF NOT EXISTS public.agent_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    industry VARCHAR(100),
    status lead_status_enum DEFAULT 'NEW',
    follow_up_date DATE,
    converted_tenant_id UUID, -- Link to invify's main tenant, populated during ONBOARDING
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 4. LEAD NOTES
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.agent_leads(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. LEAD ACTIVITIES
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.agent_leads(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    activity_type activity_type_enum NOT NULL,
    description TEXT,
    activity_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5A. LEAD ASSIGNMENT HISTORY
CREATE TABLE IF NOT EXISTS public.lead_assignment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.agent_leads(id) ON DELETE CASCADE,
    old_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    new_agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5B. LEAD CONVERSION LOGS
CREATE TABLE IF NOT EXISTS public.lead_conversion_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.agent_leads(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    converted_tenant_id UUID NOT NULL,
    conversion_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- 6. LEAD ATTACHMENTS (Supabase Storage integration)
CREATE TABLE IF NOT EXISTS public.lead_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.agent_leads(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    category attachment_category_enum DEFAULT 'OTHER',
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(1000) NOT NULL,
    file_type VARCHAR(100),
    file_size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TENANT PORTFOLIO (Instantiated during ONBOARDING)
CREATE TABLE IF NOT EXISTS public.agent_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL UNIQUE, -- Links to Invify's main tenants table
    business_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    location_address TEXT,
    location_state VARCHAR(100),
    location_lga VARCHAR(100),
    status tenant_status_enum DEFAULT 'ONBOARDING',
    activation_percentage NUMERIC(5,2) DEFAULT 0.00,
    terminal_counts INTEGER DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    total_volume NUMERIC(15,2) DEFAULT 0.00,
    onboarding_date DATE NOT NULL,
    activation_completed_at TIMESTAMPTZ,
    activated_by_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL, -- Future commission link
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 8. ACTIVATION PROGRESS
CREATE TABLE IF NOT EXISTS public.tenant_activation_progress (
    agent_tenant_id UUID PRIMARY KEY REFERENCES public.agent_tenants(id) ON DELETE CASCADE,
    current_stage activation_stage_enum DEFAULT 'REGISTRATION',
    completion_percentage NUMERIC(5,2) DEFAULT 0.00,
    is_registration_complete BOOLEAN DEFAULT true,
    is_kyc_pending BOOLEAN DEFAULT false,
    is_kyc_approved BOOLEAN DEFAULT false,
    is_terminal_assigned BOOLEAN DEFAULT false,
    is_terminal_deployed BOOLEAN DEFAULT false,
    is_training_completed BOOLEAN DEFAULT false,
    is_first_transaction BOOLEAN DEFAULT false,
    is_fully_activated BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ACTIVATION LOGS (Immutable History)
CREATE TABLE IF NOT EXISTS public.tenant_activation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_tenant_id UUID NOT NULL REFERENCES public.agent_tenants(id) ON DELETE CASCADE,
    stage activation_stage_enum NOT NULL,
    completed_by UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX idx_agent_leads_agent ON public.agent_leads(agent_id);
CREATE INDEX idx_agent_leads_status ON public.agent_leads(status);
CREATE INDEX idx_lead_activities_lead ON public.lead_activities(lead_id);
CREATE INDEX idx_agent_tenants_agent ON public.agent_tenants(agent_id);
CREATE INDEX idx_agent_tenants_status ON public.agent_tenants(status);
CREATE INDEX idx_agent_tenants_tenant_id ON public.agent_tenants(tenant_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.agent_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_activation_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_activation_logs ENABLE ROW LEVEL SECURITY;

-- Agents Policies
CREATE POLICY "Agents can view their own leads" ON public.agent_leads FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()) AND deleted_at IS NULL);
CREATE POLICY "Agents can modify their own leads" ON public.agent_leads FOR ALL USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents can manage their lead notes" ON public.lead_notes FOR ALL USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents can manage their lead activities" ON public.lead_activities FOR ALL USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents can manage their lead attachments" ON public.lead_attachments FOR ALL USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents can view their portfolio" ON public.agent_tenants FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()) AND deleted_at IS NULL);
CREATE POLICY "Agents can view activation progress" ON public.tenant_activation_progress FOR SELECT USING (agent_tenant_id IN (SELECT id FROM public.agent_tenants WHERE agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid())));
CREATE POLICY "Agents can view activation logs" ON public.tenant_activation_logs FOR SELECT USING (agent_tenant_id IN (SELECT id FROM public.agent_tenants WHERE agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid())));
CREATE POLICY "Agents can view pipelines" ON public.lead_pipelines FOR SELECT USING (true);

-- Admin/Service_Role Policies (Using previously created is_admin_or_service())
CREATE POLICY "Admin Full Access Leads" ON public.agent_leads USING (is_admin_or_service());
CREATE POLICY "Admin Full Access Notes" ON public.lead_notes USING (is_admin_or_service());
CREATE POLICY "Admin Full Access Activities" ON public.lead_activities USING (is_admin_or_service());
CREATE POLICY "Admin Full Access Attachments" ON public.lead_attachments USING (is_admin_or_service());
CREATE POLICY "Admin Full Access Pipelines" ON public.lead_pipelines USING (is_admin_or_service());
CREATE POLICY "Admin Full Access Tenants" ON public.agent_tenants USING (is_admin_or_service());
CREATE POLICY "Admin Full Access Progress" ON public.tenant_activation_progress USING (is_admin_or_service());
CREATE POLICY "Admin Full Access Logs" ON public.tenant_activation_logs USING (is_admin_or_service());

-- ==========================================
-- TRIGGERS
-- ==========================================
CREATE TRIGGER trg_agent_leads_updated_at BEFORE UPDATE ON public.agent_leads FOR EACH ROW EXECUTE PROCEDURE update_timestamp_trigger();
CREATE TRIGGER trg_lead_notes_updated_at BEFORE UPDATE ON public.lead_notes FOR EACH ROW EXECUTE PROCEDURE update_timestamp_trigger();
CREATE TRIGGER trg_agent_tenants_updated_at BEFORE UPDATE ON public.agent_tenants FOR EACH ROW EXECUTE PROCEDURE update_timestamp_trigger();
CREATE TRIGGER trg_tenant_activation_progress_updated_at BEFORE UPDATE ON public.tenant_activation_progress FOR EACH ROW EXECUTE PROCEDURE update_timestamp_trigger();
