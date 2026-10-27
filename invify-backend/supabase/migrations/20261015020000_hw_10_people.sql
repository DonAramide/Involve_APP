-- PROPOSED — NOT APPLIED. Phase 1 design artefact.
-- hw_10_people: staff profiles, guardian links + invitations, members, dependants.
-- Reuses students / users / tenant_staff / customers by reference; copies no personal data except what is listed.
-- Prerequisite: public.tenant_staff exists (created today by runtime DDL in staff.controller.ts; present in staging). U3.

BEGIN;

DO $$ BEGIN
  IF to_regclass('public.tenant_staff') IS NULL THEN
    RAISE EXCEPTION 'hw_10: public.tenant_staff is missing; codify it in its own reviewed migration first (see 07_PHASE1_REVIEW U3)';
  END IF;
  IF to_regclass('public.students') IS NULL OR to_regclass('public.users') IS NULL OR to_regclass('public.customers') IS NULL THEN
    RAISE EXCEPTION 'hw_10: required base tables missing';
  END IF;
END $$;

-- ---------------------------------------------------------------- staff profiles: employment category is DATA, not authority
CREATE TABLE IF NOT EXISTS public.hw_staff_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  tenant_staff_id     uuid NOT NULL REFERENCES public.tenant_staff(id) ON DELETE RESTRICT,
  user_id             uuid REFERENCES public.users(id) ON DELETE SET NULL,   -- login for self-service; optional
  employment_category text NOT NULL CHECK (employment_category IN ('teaching','non_teaching')),
  department          text,
  employment_status   text NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active','on_leave','exited')),
  created_by          uuid REFERENCES public.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, tenant_staff_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hw_staff_user ON public.hw_staff_profiles (tenant_id, user_id) WHERE user_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_hw_staff_tenant ON public.hw_staff_profiles;
CREATE TRIGGER trg_hw_staff_tenant BEFORE INSERT OR UPDATE OF tenant_id, tenant_staff_id ON public.hw_staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.hw_assert_same_tenant('tenant_staff','tenant_staff_id','tenant_id');
DROP TRIGGER IF EXISTS trg_hw_staff_upd ON public.hw_staff_profiles;
CREATE TRIGGER trg_hw_staff_upd BEFORE UPDATE ON public.hw_staff_profiles FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

-- ---------------------------------------------------------------- guardian links (many-to-many, tenant-scoped)
CREATE TABLE IF NOT EXISTS public.hw_guardian_links (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  student_id               uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  guardian_user_id         uuid REFERENCES public.users(id) ON DELETE RESTRICT,   -- NULL until invitation accepted
  source_entity_sync_id    text,                                                 -- reference to school_entities.sync_id (not a copy of its data)
  relationship             text NOT NULL CHECK (relationship IN ('mother','father','legal_guardian','other_relative','other')),
  status                   text NOT NULL DEFAULT 'invited'
                           CHECK (status IN ('invited','pending_verification','verified','rejected','revoked','expired')),
  is_primary               boolean NOT NULL DEFAULT false,
  -- explicit access flags: all default to NO access
  can_view_coverage        boolean NOT NULL DEFAULT false,
  can_view_premiums        boolean NOT NULL DEFAULT false,
  can_pay_premiums         boolean NOT NULL DEFAULT false,
  can_manage_enrolment     boolean NOT NULL DEFAULT false,
  verification_method      text CHECK (verification_method IN ('school_record_check','document_sighted','in_person')),
  verified_by              uuid REFERENCES public.users(id),
  verified_at              timestamptz,
  status_reason            text,
  created_by               uuid REFERENCES public.users(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  -- verified implies a human verifier, a method, and a bound guardian identity (never self-verified)
  CHECK (status <> 'verified' OR (guardian_user_id IS NOT NULL AND verified_by IS NOT NULL AND verified_at IS NOT NULL AND verification_method IS NOT NULL AND verified_by <> guardian_user_id)),
  -- access flags only meaningful when verified
  CHECK (status = 'verified' OR NOT (can_view_coverage OR can_view_premiums OR can_pay_premiums OR can_manage_enrolment)),
  CHECK (NOT can_pay_premiums OR can_view_premiums)
);
-- one live link per (student, guardian user); multiple guardians per student and children per guardian are allowed
CREATE UNIQUE INDEX IF NOT EXISTS uq_hw_guardian_live ON public.hw_guardian_links (tenant_id, student_id, guardian_user_id)
  WHERE guardian_user_id IS NOT NULL AND status IN ('invited','pending_verification','verified');
CREATE UNIQUE INDEX IF NOT EXISTS uq_hw_guardian_primary ON public.hw_guardian_links (student_id) WHERE is_primary AND status = 'verified';
CREATE INDEX IF NOT EXISTS ix_hw_guardian_user ON public.hw_guardian_links (guardian_user_id) WHERE status = 'verified';
CREATE INDEX IF NOT EXISTS ix_hw_guardian_student ON public.hw_guardian_links (tenant_id, student_id);
DROP TRIGGER IF EXISTS trg_hw_guardian_tenant ON public.hw_guardian_links;
CREATE TRIGGER trg_hw_guardian_tenant BEFORE INSERT OR UPDATE OF tenant_id, student_id ON public.hw_guardian_links
  FOR EACH ROW EXECUTE FUNCTION public.hw_assert_same_tenant('students','student_id','COALESCE(tenant_id::text, school_id::text)');
DROP TRIGGER IF EXISTS trg_hw_guardian_upd ON public.hw_guardian_links;
CREATE TRIGGER trg_hw_guardian_upd BEFORE UPDATE ON public.hw_guardian_links FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

-- Allowed link transitions (forward-only; verified can only be revoked).
CREATE OR REPLACE FUNCTION public.hw_guardian_link_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF (OLD.status, NEW.status) IN (('invited','pending_verification'),('invited','expired'),('invited','revoked'),
      ('pending_verification','verified'),('pending_verification','rejected'),('pending_verification','revoked'),
      ('verified','revoked')) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'hw: illegal guardian link transition % -> %', OLD.status, NEW.status;
END $$;
DROP TRIGGER IF EXISTS trg_hw_guardian_transition ON public.hw_guardian_links;
CREATE TRIGGER trg_hw_guardian_transition BEFORE UPDATE OF status ON public.hw_guardian_links FOR EACH ROW EXECUTE FUNCTION public.hw_guardian_link_transition();

CREATE TABLE IF NOT EXISTS public.hw_guardian_invitations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  link_id            uuid NOT NULL REFERENCES public.hw_guardian_links(id) ON DELETE CASCADE,
  token_hash         text NOT NULL UNIQUE,                          -- sha256 of random 32-byte token (same approach as invite.service)
  channel            text NOT NULL CHECK (channel IN ('email','sms','whatsapp')),
  contact_value      text,                                          -- purged (NULL) on accept / expiry / revoke
  status             text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','accepted','expired','revoked')),
  failed_attempts    integer NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 10),
  expires_at         timestamptz NOT NULL,
  accepted_at        timestamptz,
  accepted_by_user   uuid REFERENCES public.users(id),
  created_by         uuid REFERENCES public.users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (status = 'sent' OR contact_value IS NULL)
);
CREATE INDEX IF NOT EXISTS ix_hw_invite_link ON public.hw_guardian_invitations (link_id);
CREATE INDEX IF NOT EXISTS ix_hw_invite_expiry ON public.hw_guardian_invitations (expires_at) WHERE status = 'sent';

-- ---------------------------------------------------------------- members (the insured person; exactly one source identity)
CREATE TABLE IF NOT EXISTS public.hw_members (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  mode                text NOT NULL CHECK (mode IN ('school','retail','services')),
  member_category     text NOT NULL CHECK (member_category IN ('student','teaching_staff','non_teaching_staff','dependant','retail_employee','services_member')),
  student_id          uuid REFERENCES public.students(id)          ON DELETE RESTRICT,
  staff_profile_id    uuid REFERENCES public.hw_staff_profiles(id) ON DELETE RESTRICT,
  customer_id         varchar(255) REFERENCES public.customers(id) ON DELETE RESTRICT,
  dependant_id        uuid,                                         -- FK added after hw_dependants exists
  insurer_member_ref  text,                                         -- issued by insurer; only set from verified provider data
  cohort_label        text,                                         -- free-text e.g. '2026/2027' (no academic_sessions table exists)
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_by          uuid REFERENCES public.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(student_id, staff_profile_id, customer_id, dependant_id) = 1),
  CHECK ((member_category = 'student') = (student_id IS NOT NULL)),
  CHECK ((member_category IN ('teaching_staff','non_teaching_staff','retail_employee')) = (staff_profile_id IS NOT NULL)),
  CHECK ((member_category = 'dependant') = (dependant_id IS NOT NULL)),
  CHECK ((member_category = 'services_member') = (customer_id IS NOT NULL)),
  CHECK (mode <> 'school' OR member_category IN ('student','teaching_staff','non_teaching_staff','dependant'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hw_member_student  ON public.hw_members (tenant_id, student_id)       WHERE student_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_hw_member_staff    ON public.hw_members (tenant_id, staff_profile_id)  WHERE staff_profile_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_hw_member_customer ON public.hw_members (tenant_id, customer_id)      WHERE customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_hw_member_insurer  ON public.hw_members (tenant_id, insurer_member_ref) WHERE insurer_member_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_hw_member_tenant_cat ON public.hw_members (tenant_id, member_category, status);
-- tenant-consistency for every source reference
DROP TRIGGER IF EXISTS trg_hw_member_t_student ON public.hw_members;
CREATE TRIGGER trg_hw_member_t_student BEFORE INSERT OR UPDATE OF tenant_id, student_id ON public.hw_members
  FOR EACH ROW EXECUTE FUNCTION public.hw_assert_same_tenant('students','student_id','COALESCE(tenant_id::text, school_id::text)');
DROP TRIGGER IF EXISTS trg_hw_member_t_staff ON public.hw_members;
CREATE TRIGGER trg_hw_member_t_staff BEFORE INSERT OR UPDATE OF tenant_id, staff_profile_id ON public.hw_members
  FOR EACH ROW EXECUTE FUNCTION public.hw_assert_same_tenant('hw_staff_profiles','staff_profile_id','tenant_id::text');
DROP TRIGGER IF EXISTS trg_hw_member_t_customer ON public.hw_members;
CREATE TRIGGER trg_hw_member_t_customer BEFORE INSERT OR UPDATE OF tenant_id, customer_id ON public.hw_members
  FOR EACH ROW EXECUTE FUNCTION public.hw_assert_same_tenant('customers','customer_id','tenant_id::text');
DROP TRIGGER IF EXISTS trg_hw_member_upd ON public.hw_members;
CREATE TRIGGER trg_hw_member_upd BEFORE UPDATE ON public.hw_members FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

-- ---------------------------------------------------------------- dependants (only where the plan allows; minimal fields)
CREATE TABLE IF NOT EXISTS public.hw_dependants (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  principal_member_id  uuid NOT NULL REFERENCES public.hw_members(id) ON DELETE RESTRICT,
  relationship         text NOT NULL CHECK (relationship IN ('spouse','child','parent','other')),
  full_name            text NOT NULL,
  date_of_birth        date NOT NULL,                                -- needed for eligibility bands; treated as personal data
  sex                  text CHECK (sex IN ('female','male')),
  status               text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  created_by           uuid REFERENCES public.users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_hw_dependant_principal ON public.hw_dependants (tenant_id, principal_member_id);
DROP TRIGGER IF EXISTS trg_hw_dep_tenant ON public.hw_dependants;
CREATE TRIGGER trg_hw_dep_tenant BEFORE INSERT OR UPDATE OF tenant_id, principal_member_id ON public.hw_dependants
  FOR EACH ROW EXECUTE FUNCTION public.hw_assert_same_tenant('hw_members','principal_member_id','tenant_id::text');
DROP TRIGGER IF EXISTS trg_hw_dep_upd ON public.hw_dependants;
CREATE TRIGGER trg_hw_dep_upd BEFORE UPDATE ON public.hw_dependants FOR EACH ROW EXECUTE FUNCTION public.hw_set_updated_at();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_hw_member_dependant') THEN
    ALTER TABLE public.hw_members ADD CONSTRAINT fk_hw_member_dependant
      FOREIGN KEY (dependant_id) REFERENCES public.hw_dependants(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_hw_member_dependant ON public.hw_members (dependant_id) WHERE dependant_id IS NOT NULL;

COMMIT;
