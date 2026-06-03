-- ==========================================
-- INVIFY AGENT PORTAL - MILESTONE 1 MIGRATION
-- Supabase PostgreSQL Schema (Revised)
-- ==========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. CLEANUP EXISTING SCHEMA (For idempotent dev migrations)
DROP TABLE IF EXISTS public.agent_dashboard_snapshots CASCADE;
DROP TABLE IF EXISTS public.agent_performance_reports CASCADE;
DROP TABLE IF EXISTS public.agent_notifications CASCADE;
DROP TABLE IF EXISTS public.agent_audit_logs CASCADE;
DROP TABLE IF EXISTS public.agent_notes CASCADE;
DROP TABLE IF EXISTS public.agent_profiles CASCADE;
DROP TABLE IF EXISTS public.agent_status_history CASCADE;
DROP TABLE IF EXISTS public.agents CASCADE;
DROP TABLE IF EXISTS public.agent_territories CASCADE;
DROP TABLE IF EXISTS public.agent_roles CASCADE;


-- 1. ENUMS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_status_enum') THEN
        CREATE TYPE agent_status_enum AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_kyc_status_enum') THEN
        CREATE TYPE agent_kyc_status_enum AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_priority_enum') THEN
        CREATE TYPE notification_priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
    END IF;
END$$;

-- 2. AGENT ROLES (RBAC)
CREATE TABLE IF NOT EXISTS public.agent_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(100) NOT NULL UNIQUE,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AGENT TERRITORIES
CREATE TABLE IF NOT EXISTS public.agent_territories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    territory_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    country VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    lga VARCHAR(100),
    zone VARCHAR(100),
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 4. AGENTS REGISTRY (Core Table)
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE, -- Links to auth.users in Supabase
    agent_code VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    phone VARCHAR(50),
    status agent_status_enum DEFAULT 'PENDING',
    role_id UUID REFERENCES public.agent_roles(id),
    territory_id UUID REFERENCES public.agent_territories(id) ON DELETE SET NULL,
    referred_by_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    supervisor_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    commission_plan_id UUID, -- Will link to Commission Engine in Milestone 3
    reputation_points INTEGER DEFAULT 0,
    lifetime_commissions NUMERIC(15,2) DEFAULT 0.00,
    total_tenants_onboarded INTEGER DEFAULT 0,
    total_leads_generated INTEGER DEFAULT 0,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 5. AGENT STATUS HISTORY
CREATE TABLE IF NOT EXISTS public.agent_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    old_status agent_status_enum,
    new_status agent_status_enum NOT NULL,
    changed_by UUID NOT NULL, -- actor ID (Admin or Agent)
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AGENT PROFILES (KYC, Bank Info, Personal Details)
CREATE TABLE IF NOT EXISTS public.agent_profiles (
    agent_id UUID PRIMARY KEY REFERENCES public.agents(id) ON DELETE CASCADE,
    address TEXT,
    profile_photo_url VARCHAR(500),
    bank_name VARCHAR(150),
    account_number VARCHAR(50),
    account_name VARCHAR(255),
    bvn VARCHAR(50),
    kyc_status agent_kyc_status_enum DEFAULT 'PENDING',
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 7. AGENT NOTES (Admin CRM Notes for Agents)
CREATE TABLE IF NOT EXISTS public.agent_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL, -- References Admin users
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AGENT AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.agent_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL, -- Admin or Agent ID who performed the action
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    action VARCHAR(255) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AGENT NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.agent_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    priority notification_priority_enum DEFAULT 'LOW',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. AGENT PERFORMANCE REPORTS
CREATE TABLE IF NOT EXISTS public.agent_performance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    report_period VARCHAR(50) NOT NULL, -- e.g., '2026-06'
    metrics JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. AGENT DASHBOARD SNAPSHOTS (KPI Trend Reporting)
CREATE TABLE IF NOT EXISTS public.agent_dashboard_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_leads INTEGER DEFAULT 0,
    active_tenants INTEGER DEFAULT 0,
    pending_commissions NUMERIC(15,2) DEFAULT 0.00,
    paid_commissions NUMERIC(15,2) DEFAULT 0.00,
    reputation_points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, snapshot_date)
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX idx_agents_auth_user_id ON public.agents(auth_user_id);
CREATE INDEX idx_agents_email ON public.agents(email);
CREATE INDEX idx_agents_code ON public.agents(agent_code);
CREATE INDEX idx_agents_status ON public.agents(status);
CREATE INDEX idx_agents_referred_by ON public.agents(referred_by_agent_id);
CREATE INDEX idx_agents_supervisor ON public.agents(supervisor_agent_id);
CREATE INDEX idx_agent_audit_entity ON public.agent_audit_logs(entity_type, entity_id);
CREATE INDEX idx_agent_notifications_agent_id_read ON public.agent_notifications(agent_id, is_read);
CREATE INDEX idx_agent_perf_agent_id ON public.agent_performance_reports(agent_id);
CREATE INDEX idx_agent_dash_snapshots_date ON public.agent_dashboard_snapshots(agent_id, snapshot_date);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_dashboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Utility check for service_role or admin (Supabase standard)
-- Validates if the request is executed by the service_role key or an authenticated Admin user.
CREATE OR REPLACE FUNCTION is_admin_or_service() RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.role() = 'service_role' OR 
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agents Policies
CREATE POLICY "Agents can view their own record" ON public.agents FOR SELECT USING (auth_user_id = auth.uid() AND deleted_at IS NULL);
CREATE POLICY "Agents can view their own profile" ON public.agent_profiles FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()) AND deleted_at IS NULL);
CREATE POLICY "Agents can update their own profile" ON public.agent_profiles FOR UPDATE USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents can view their own status history" ON public.agent_status_history FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents can view their own notifications" ON public.agent_notifications FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents can view their own performance" ON public.agent_performance_reports FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents can view their own dashboard snapshots" ON public.agent_dashboard_snapshots FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents can view active territories" ON public.agent_territories FOR SELECT USING (deleted_at IS NULL);

-- Admin & Service Role Production-Grade Policies
-- Allow full access to any query initiated by service_role or admin
CREATE POLICY "Admin/Service Role Full Access Agents" ON public.agents USING (is_admin_or_service());
CREATE POLICY "Admin/Service Role Full Access Territories" ON public.agent_territories USING (is_admin_or_service());
CREATE POLICY "Admin/Service Role Full Access History" ON public.agent_status_history USING (is_admin_or_service());
CREATE POLICY "Admin/Service Role Full Access Profiles" ON public.agent_profiles USING (is_admin_or_service());
CREATE POLICY "Admin/Service Role Full Access Notes" ON public.agent_notes USING (is_admin_or_service());
CREATE POLICY "Admin/Service Role Full Access Audit" ON public.agent_audit_logs USING (is_admin_or_service());
CREATE POLICY "Admin/Service Role Full Access Notifications" ON public.agent_notifications USING (is_admin_or_service());
CREATE POLICY "Admin/Service Role Full Access Performance" ON public.agent_performance_reports USING (is_admin_or_service());
CREATE POLICY "Admin/Service Role Full Access Snapshots" ON public.agent_dashboard_snapshots USING (is_admin_or_service());

-- ==========================================
-- TRIGGERS
-- ==========================================
CREATE OR REPLACE FUNCTION update_timestamp_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE PROCEDURE update_timestamp_trigger();
CREATE TRIGGER trg_agent_territories_updated_at BEFORE UPDATE ON public.agent_territories FOR EACH ROW EXECUTE PROCEDURE update_timestamp_trigger();
CREATE TRIGGER trg_agent_profiles_updated_at BEFORE UPDATE ON public.agent_profiles FOR EACH ROW EXECUTE PROCEDURE update_timestamp_trigger();
CREATE TRIGGER trg_agent_roles_updated_at BEFORE UPDATE ON public.agent_roles FOR EACH ROW EXECUTE PROCEDURE update_timestamp_trigger();
