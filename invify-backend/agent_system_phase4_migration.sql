-- ==========================================
-- INVIFY AGENT PORTAL - MILESTONE 4 MIGRATION
-- Supabase PostgreSQL Schema: Support, KB, Training, Certs
-- ==========================================

-- 0. CLEANUP (For Dev)
DROP TABLE IF EXISTS public.agent_certificates CASCADE;
DROP TABLE IF EXISTS public.assessment_attempts CASCADE;
DROP TABLE IF EXISTS public.assessment_questions CASCADE;
DROP TABLE IF EXISTS public.training_assessments CASCADE;
DROP TABLE IF EXISTS public.training_audits CASCADE;
DROP TABLE IF EXISTS public.training_progress CASCADE;
DROP TABLE IF EXISTS public.training_modules CASCADE;
DROP TABLE IF EXISTS public.training_courses CASCADE;
DROP TABLE IF EXISTS public.kb_audits CASCADE;
DROP TABLE IF EXISTS public.kb_article_versions CASCADE;
DROP TABLE IF EXISTS public.kb_articles CASCADE;
DROP TABLE IF EXISTS public.kb_categories CASCADE;
DROP TABLE IF EXISTS public.support_ticket_assignments CASCADE;
DROP TABLE IF EXISTS public.support_ticket_audits CASCADE;
DROP TABLE IF EXISTS public.support_ticket_comments CASCADE;
DROP TABLE IF EXISTS public.support_ticket_attachments CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;

-- 1. ENUMS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority_enum') THEN
        CREATE TYPE ticket_priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status_enum') THEN
        CREATE TYPE ticket_status_enum AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_AGENT', 'ESCALATED', 'RESOLVED', 'CLOSED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kb_status_enum') THEN
        CREATE TYPE kb_status_enum AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assessment_status_enum') THEN
        CREATE TYPE assessment_status_enum AS ENUM ('PASSED', 'FAILED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type_enum') THEN
        CREATE TYPE content_type_enum AS ENUM ('VIDEO', 'DOCUMENT', 'INTERACTIVE');
    END IF;
END$$;

-- ==========================================
-- A. SUPPORT CENTER
-- ==========================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    tenant_id UUID, -- Optional linking to a specific merchant
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority ticket_priority_enum DEFAULT 'MEDIUM',
    status ticket_status_enum DEFAULT 'OPEN',
    assigned_admin_id UUID,
    first_response_due_at TIMESTAMPTZ,
    resolution_due_at TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    sla_breach_at TIMESTAMPTZ, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.support_ticket_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    assigned_admin_id UUID NOT NULL,
    previous_admin_id UUID,
    assigned_by UUID NOT NULL,
    reason TEXT,
    assigned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    is_admin_comment BOOLEAN DEFAULT FALSE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL,
    old_status ticket_status_enum,
    new_status ticket_status_enum,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- B. KNOWLEDGE BASE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.kb_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kb_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.kb_categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    status kb_status_enum DEFAULT 'DRAFT',
    author_id UUID NOT NULL,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kb_article_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES public.kb_articles(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(article_id, version)
);

CREATE TABLE IF NOT EXISTS public.kb_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES public.kb_articles(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- C. TRAINING CENTER
-- ==========================================
CREATE TABLE IF NOT EXISTS public.training_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_mandatory BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content_type content_type_enum DEFAULT 'VIDEO',
    content_url TEXT,
    sequence_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
    completion_percentage NUMERIC(5,2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.training_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.training_courses(id) ON DELETE SET NULL,
    changed_by UUID NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- D. CERTIFICATION ENGINE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.training_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE UNIQUE,
    title VARCHAR(255) NOT NULL,
    passing_score NUMERIC(5,2) NOT NULL DEFAULT 80.00,
    time_limit_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assessment_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES public.training_assessments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assessment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES public.training_assessments(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    score NUMERIC(5,2) NOT NULL,
    passing_score NUMERIC(5,2) NOT NULL,
    passed BOOLEAN NOT NULL,
    status assessment_status_enum NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    verification_uuid UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
    assessment_attempt_id UUID NOT NULL REFERENCES public.assessment_attempts(id),
    certificate_url TEXT,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID,
    revocation_reason TEXT,
    UNIQUE(agent_id, course_id)
);

-- ==========================================
-- INDEXES & RLS
-- ==========================================
CREATE INDEX idx_support_tickets_agent ON public.support_tickets(agent_id);
CREATE INDEX idx_support_tickets_tenant ON public.support_tickets(tenant_id);
CREATE INDEX idx_support_tickets_sla ON public.support_tickets(sla_breach_at, first_response_due_at, resolution_due_at);
CREATE INDEX idx_kb_articles_search ON public.kb_articles USING GIN (to_tsvector('english', title || ' ' || content));
CREATE INDEX idx_agent_certificates ON public.agent_certificates(agent_id);
CREATE INDEX idx_agent_certificates_verify ON public.agent_certificates(verification_uuid);

-- Enforce Triggers
CREATE TRIGGER trg_support_tickets_updated BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE PROCEDURE update_timestamp_trigger();
CREATE TRIGGER trg_kb_articles_updated BEFORE UPDATE ON public.kb_articles FOR EACH ROW EXECUTE PROCEDURE update_timestamp_trigger();

-- RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_article_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents view own tickets" ON public.support_tickets FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents view published KB" ON public.kb_articles FOR SELECT USING (status = 'PUBLISHED');
CREATE POLICY "Agents view own progress" ON public.training_progress FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents view own attempts" ON public.assessment_attempts FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents view own certs" ON public.agent_certificates FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admin Full Access" ON public.support_tickets USING (is_admin_or_service());
CREATE POLICY "Admin Full Access" ON public.support_ticket_assignments USING (is_admin_or_service());
CREATE POLICY "Admin Full Access" ON public.kb_articles USING (is_admin_or_service());
CREATE POLICY "Admin Full Access" ON public.training_courses USING (is_admin_or_service());
CREATE POLICY "Admin Full Access" ON public.agent_certificates USING (is_admin_or_service());
