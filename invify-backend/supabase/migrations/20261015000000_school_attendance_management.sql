/*
=============================================================================
Migration: school_attendance_management
Description: Multi-tenant Attendance Management & Reporting Module for Invify School Mode.
             Includes attendance settings, calendar exceptions (holidays),
             teacher-to-class assignments, attendance sessions/registers,
             individual student attendance entries, and audited corrections.
             STAGING-ONLY MIGRATION — DO NOT APPLY TO PRODUCTION WITHOUT AUTHORIZATION.

Rollback: supabase/rollbacks/20261015000000_school_attendance_management.sql
=============================================================================
*/

BEGIN;

-- 1. Attendance Settings (Tenant Scoped)
CREATE TABLE IF NOT EXISTS public.attendance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    minimum_attendance_threshold NUMERIC(5,2) NOT NULL DEFAULT 80.00 CHECK (minimum_attendance_threshold >= 0 AND minimum_attendance_threshold <= 100),
    policy_present TEXT NOT NULL DEFAULT 'attended' CHECK (policy_present IN ('attended', 'absent', 'excluded')),
    policy_late TEXT NOT NULL DEFAULT 'attended' CHECK (policy_late IN ('attended', 'absent', 'excluded')),
    policy_excused TEXT NOT NULL DEFAULT 'excluded' CHECK (policy_excused IN ('attended', 'absent', 'excluded')),
    policy_absent TEXT NOT NULL DEFAULT 'absent' CHECK (policy_absent IN ('attended', 'absent', 'excluded')),
    instructional_weekdays INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id)
);

-- 2. School Calendar Exceptions / Non-Instructional Dates (Holidays, Closures, Breaks)
CREATE TABLE IF NOT EXISTS public.attendance_calendar_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    description TEXT,
    is_instructional BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, exception_date)
);

-- 3. Teacher-to-Class Assignments (RBAC & Class Assignment Guard)
CREATE TABLE IF NOT EXISTS public.attendance_class_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    class_id TEXT, -- localId, sync_id, or class level
    class_name TEXT NOT NULL,
    teacher_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    teacher_name TEXT NOT NULL,
    subject_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_att_assignments_tenant_class
    ON public.attendance_class_assignments(tenant_id, class_name);
CREATE INDEX IF NOT EXISTS idx_att_assignments_teacher
    ON public.attendance_class_assignments(tenant_id, teacher_user_id);

-- 4. Attendance Sessions / Registers (Header for a class on a given date)
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    date DATE NOT NULL,
    teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    teacher_name TEXT,
    subject_name TEXT,
    academic_year TEXT,
    term TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
    finalized_at TIMESTAMPTZ,
    finalized_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure only one session exists per tenant, class, date, and subject (or null subject)
CREATE UNIQUE INDEX IF NOT EXISTS idx_att_sessions_unique_subject
    ON public.attendance_sessions (tenant_id, class_name, date, COALESCE(subject_name, ''));

CREATE INDEX IF NOT EXISTS idx_att_sessions_tenant_date
    ON public.attendance_sessions (tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_att_sessions_tenant_class
    ON public.attendance_sessions (tenant_id, class_name);

-- 5. Student Attendance Entries (Line Items)
CREATE TABLE IF NOT EXISTS public.student_attendance_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL, -- UUID or sync_id
    student_name TEXT NOT NULL,
    admission_number TEXT,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_att_tenant_student
    ON public.student_attendance_entries (tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_att_status
    ON public.student_attendance_entries (status);

-- 6. Attendance Audit Log (History of saves, finalizations, corrections)
CREATE TABLE IF NOT EXISTS public.attendance_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    entry_id UUID,
    student_id TEXT,
    action TEXT NOT NULL CHECK (action IN ('SESSION_CREATED', 'DRAFT_SAVED', 'FINALIZED', 'CORRECTION', 'BULK_MARKED')),
    performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    performer_role TEXT,
    performer_name TEXT,
    previous_status TEXT,
    new_status TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_att_audit_tenant_session
    ON public.attendance_audit_log (tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_att_audit_student
    ON public.attendance_audit_log (tenant_id, student_id);

-- Enable RLS for all newly created tables
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_calendar_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_audit_log ENABLE ROW LEVEL SECURITY;

-- Service role bypass policies
CREATE POLICY attendance_settings_service_role ON public.attendance_settings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY attendance_calendar_exceptions_service_role ON public.attendance_calendar_exceptions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY attendance_class_assignments_service_role ON public.attendance_class_assignments
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY attendance_sessions_service_role ON public.attendance_sessions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY student_attendance_entries_service_role ON public.student_attendance_entries
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY attendance_audit_log_service_role ON public.attendance_audit_log
    FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
