/*
=============================================================================
Rollback: school_attendance_management
=============================================================================
*/

BEGIN;

DROP TABLE IF EXISTS public.attendance_audit_log CASCADE;
DROP TABLE IF EXISTS public.student_attendance_entries CASCADE;
DROP TABLE IF EXISTS public.attendance_sessions CASCADE;
DROP TABLE IF EXISTS public.attendance_class_assignments CASCADE;
DROP TABLE IF EXISTS public.attendance_calendar_exceptions CASCADE;
DROP TABLE IF EXISTS public.attendance_settings CASCADE;

COMMIT;
