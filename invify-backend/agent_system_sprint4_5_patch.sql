-- ==========================================
-- INVIFY AGENT PORTAL - SPRINT 4/5 PATCH
-- Creates missing Agent Sessions table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.agent_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent ON public.agent_sessions(agent_id);

ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own sessions" ON public.agent_sessions 
    FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));

CREATE POLICY "Agents can delete own sessions" ON public.agent_sessions 
    FOR DELETE USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admin Full Sessions" ON public.agent_sessions USING (is_admin_or_service());
