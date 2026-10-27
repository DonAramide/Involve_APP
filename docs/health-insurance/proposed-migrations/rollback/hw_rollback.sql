-- PROPOSED ROLLBACK SCRIPT — NOT EXECUTED.
-- Purpose: Complete, clean reversal of proposed Health & Wellness tables and functions
-- Execution constraint: Requires explicit stakeholder approval; MUST NOT be run in production without signoff.
-- Tables dropped in reverse dependency order.

BEGIN;

-- 1. Drop audit and payments
DROP TABLE IF EXISTS public.hw_audit_events CASCADE;
DROP TABLE IF EXISTS public.hw_payment_allocations CASCADE;
DROP TABLE IF EXISTS public.hw_payments CASCADE;
DROP TABLE IF EXISTS public.hw_premium_invoices CASCADE;

-- 2. Drop claims, policies, and enrolments
DROP TABLE IF EXISTS public.hw_provider_events CASCADE;
DROP TABLE IF EXISTS public.hw_claim_status_records CASCADE;
DROP TABLE IF EXISTS public.hw_policies CASCADE;
DROP TABLE IF EXISTS public.hw_enrolments CASCADE;

-- 3. Drop members, dependants, guardians, staff
DROP TABLE IF EXISTS public.hw_dependants CASCADE;
DROP TABLE IF EXISTS public.hw_members CASCADE;
DROP TABLE IF EXISTS public.hw_guardian_invitations CASCADE;
DROP TABLE IF EXISTS public.hw_guardian_links CASCADE;
DROP TABLE IF EXISTS public.hw_staff_profiles CASCADE;

-- 4. Drop catalogue, offers, settings, grants
DROP TABLE IF EXISTS public.hw_facility_plans CASCADE;
DROP TABLE IF EXISTS public.hw_facilities CASCADE;
DROP TABLE IF EXISTS public.hw_tenant_plan_offers CASCADE;
DROP TABLE IF EXISTS public.hw_plan_versions CASCADE;
DROP TABLE IF EXISTS public.hw_plans CASCADE;
DROP TABLE IF EXISTS public.hw_providers CASCADE;
DROP TABLE IF EXISTS public.hw_platform_grants CASCADE;
DROP TABLE IF EXISTS public.hw_permission_grants CASCADE;
DROP TABLE IF EXISTS public.hw_tenant_settings CASCADE;

-- 5. Drop triggers and helper functions
DROP FUNCTION IF EXISTS public.hw_current_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS public.hw_invoice_transition() CASCADE;
DROP FUNCTION IF EXISTS public.hw_payment_transition() CASCADE;
DROP FUNCTION IF EXISTS public.hw_enrolment_transition() CASCADE;
DROP FUNCTION IF EXISTS public.hw_enrolment_active_policy_check() CASCADE;
DROP FUNCTION IF EXISTS public.hw_guardian_link_transition() CASCADE;
DROP FUNCTION IF EXISTS public.hw_plan_version_immutable() CASCADE;
DROP FUNCTION IF EXISTS public.hw_assert_same_tenant() CASCADE;
DROP FUNCTION IF EXISTS public.hw_block_mutation() CASCADE;
DROP FUNCTION IF EXISTS public.hw_set_updated_at() CASCADE;

COMMIT;
