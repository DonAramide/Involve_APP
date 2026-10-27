-- PROPOSED — NOT APPLIED.
-- School ID cards and school entry/exit tracking.
-- Does not alter classroom attendance. Does not read or write
-- attendance_records, student_attendance, hw_guardian_links, or customers.
-- Does not insert any rows.
--
-- Review and rollback:
--   docs/school/20261026233000_school_id_cards_and_entry_exit_REVIEW.md
--
-- Do not apply this file to staging or production until that review is approved.
-- Dropping these tables is the rollback. Do not drop students, tenant_staff,
-- users, tenants, attendance_records, or student_attendance.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared checks
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.school_gate_role_allowed(p_role text, p_allowed text[])
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  token text;
  seen boolean := false;
BEGIN
  IF p_role IS NULL OR btrim(p_role) = '' THEN
    RAISE EXCEPTION 'school gate: user role is missing';
  END IF;
  FOREACH token IN ARRAY string_to_array(lower(p_role), ',') LOOP
    token := btrim(token);
    IF token = '' THEN
      CONTINUE;
    END IF;
    IF NOT token = ANY (p_allowed) THEN
      RAISE EXCEPTION 'school gate: role % is not allowed for this action', token;
    END IF;
    seen := true;
  END LOOP;
  IF NOT seen THEN
    RAISE EXCEPTION 'school gate: user role is missing';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.school_gate_assert_server_time(p_ts timestamptz)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_ts IS NULL
     OR p_ts < transaction_timestamp() - interval '2 seconds'
     OR p_ts > transaction_timestamp() + interval '2 seconds' THEN
    RAISE EXCEPTION 'school gate: timestamp must be the database transaction time';
  END IF;
END $$;

-- Supabase installs pgcrypto in the extensions schema. A SQL function with
-- search_path = public cannot see extensions.digest, and an unqualified
-- digest(bytea, unknown) call fails while the function is being created.
-- Dynamic SQL resolves the function at runtime and casts the algorithm to text.
CREATE OR REPLACE FUNCTION public.school_gate_sha256_hex(p_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_bytes bytea;
  v_hash bytea;
BEGIN
  IF p_value IS NULL OR btrim(p_value) = '' THEN
    RETURN NULL;
  END IF;
  v_bytes := convert_to(btrim(p_value), 'UTF8');
  BEGIN
    EXECUTE 'SELECT extensions.digest($1, $2::text)'
      INTO v_hash
      USING v_bytes, 'sha256';
  EXCEPTION
    WHEN undefined_function OR invalid_schema_name THEN
      EXECUTE 'SELECT public.digest($1, $2::text)'
        INTO v_hash
        USING v_bytes, 'sha256';
  END;
  RETURN encode(v_hash, 'hex');
END $$;

CREATE OR REPLACE FUNCTION public.school_gate_reject_predictable_token(
  p_hash text,
  p_values text[]
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  candidate text;
BEGIN
  IF p_hash IS NULL OR p_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'school gate: token hash must be 64 lowercase hex characters';
  END IF;
  FOREACH candidate IN ARRAY p_values LOOP
    IF candidate IS NOT NULL AND p_hash = public.school_gate_sha256_hex(candidate) THEN
      RAISE EXCEPTION 'school gate: token must be a random secret, not an identity value';
    END IF;
  END LOOP;
END $$;

-- School administrator for cards, contact verification, and corrections.
-- tenant_operator and teacher are scan operators, not administrators.
-- The bare role "admin" is a platform role in resolveTenantScope and is rejected.
CREATE OR REPLACE FUNCTION public.school_gate_assert_school_admin(p_user_id uuid, p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_tenant text;
  v_active boolean;
BEGIN
  SELECT role, tenant_id, is_active
    INTO v_role, v_tenant, v_active
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND OR v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'school gate: school administrator is missing or inactive';
  END IF;
  IF v_tenant IS DISTINCT FROM p_tenant_id::text THEN
    RAISE EXCEPTION 'school gate: school administrator belongs to another tenant';
  END IF;
  -- owner and tenant_admin are the existing tenant administration roles.
  -- school_admin is only a health-viewer alias, and tenant_owner is a policy
  -- name. Neither is a users.role accepted by the backend role checks.
  PERFORM public.school_gate_role_allowed(v_role, ARRAY[
    'owner', 'tenant_admin'
  ]);
END $$;

-- Gate scanner. Cannot be a platform role, even as one token in a comma-separated list.
CREATE OR REPLACE FUNCTION public.school_gate_assert_scan_operator(p_user_id uuid, p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_tenant text;
  v_active boolean;
BEGIN
  SELECT role, tenant_id, is_active
    INTO v_role, v_tenant, v_active
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND OR v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'school gate: scan operator is missing or inactive';
  END IF;
  IF v_tenant IS DISTINCT FROM p_tenant_id::text THEN
    RAISE EXCEPTION 'school gate: scan operator belongs to another tenant';
  END IF;
  PERFORM public.school_gate_role_allowed(v_role, ARRAY[
    'owner', 'tenant_admin', 'tenant_operator', 'teacher'
  ]);
END $$;

CREATE OR REPLACE FUNCTION public.school_gate_assert_student(p_tenant_id uuid, p_student_id uuid, p_require_active boolean)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  -- p_require_active is accepted so callers can share the staff signature.
  -- public.students has no reliable status column in the production baseline,
  -- so student activity is not filtered here.
  IF p_require_active IS NULL THEN
    RAISE EXCEPTION 'school gate: student active flag is required';
  END IF;
  SELECT tenant_id INTO v_tenant
  FROM public.students
  WHERE id = p_student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'school gate: student does not exist';
  END IF;
  IF v_tenant IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'school gate: student belongs to another tenant';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.school_gate_assert_staff(
  p_tenant_id uuid,
  p_staff_id uuid,
  p_require_active boolean
)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_tenant text;
  v_active boolean;
BEGIN
  SELECT tenant_id, is_active
    INTO v_tenant, v_active
  FROM public.tenant_staff
  WHERE id = p_staff_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'school gate: staff member does not exist';
  END IF;
  IF v_tenant IS DISTINCT FROM p_tenant_id::text THEN
    RAISE EXCEPTION 'school gate: staff member belongs to another tenant';
  END IF;
  IF p_require_active AND v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'school gate: staff member is inactive';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.school_gate_assert_admin_subject(p_tenant_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  PERFORM public.school_gate_assert_school_admin(p_user_id, p_tenant_id);
END $$;

CREATE OR REPLACE FUNCTION public.school_gate_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'school gate: % cannot be deleted or truncated', TG_TABLE_NAME;
END $$;

-- ---------------------------------------------------------------------------
-- Settings. One row per tenant. Notification switches default off.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.school_id_card_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE RESTRICT,
  student_template text NOT NULL DEFAULT 'classic_school',
  staff_template text NOT NULL DEFAULT 'classic_school',
  admin_template text NOT NULL DEFAULT 'classic_school',
  paper_size text NOT NULL DEFAULT 'A4',
  card_width_mm numeric(5,2) NOT NULL DEFAULT 85.60,
  card_height_mm numeric(5,2) NOT NULL DEFAULT 53.98,
  print_orientation text NOT NULL DEFAULT 'portrait',
  logo_placement text NOT NULL DEFAULT 'left',
  accent_color text NOT NULL DEFAULT '#1F4B99',
  show_address boolean NOT NULL DEFAULT true,
  show_class_or_department boolean NOT NULL DEFAULT true,
  show_status boolean NOT NULL DEFAULT true,
  show_issue_date boolean NOT NULL DEFAULT true,
  show_expiry boolean NOT NULL DEFAULT false,
  disclaimer text NOT NULL DEFAULT 'This card remains the property of the issuing institution. It must be presented when requested by authorized school personnel. If found, please return it to the issuing institution. Unauthorized use, alteration, or transfer is prohibited.',
  signature_image_url text,
  signatory_name text,
  signatory_designation text,
  lost_found_phone text,
  lost_found_email text,
  notify_student_arrival boolean NOT NULL DEFAULT false,
  notify_student_departure boolean NOT NULL DEFAULT false,
  notify_staff_arrival boolean NOT NULL DEFAULT false,
  notify_staff_departure boolean NOT NULL DEFAULT false,
  track_admin_entry boolean NOT NULL DEFAULT false,
  duplicate_scan_window_seconds integer NOT NULL DEFAULT 45,
  updated_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_id_card_settings_templates CHECK (
    student_template IN ('classic_school','modern_corporate','minimal_white','academic_blue','premium_identity','compact_barcode')
    AND staff_template IN ('classic_school','modern_corporate','minimal_white','academic_blue','premium_identity','compact_barcode')
    AND admin_template IN ('classic_school','modern_corporate','minimal_white','academic_blue','premium_identity','compact_barcode')
  ),
  CONSTRAINT school_id_card_settings_paper CHECK (paper_size IN ('A4','Letter','CR80')),
  CONSTRAINT school_id_card_settings_size CHECK (
    card_width_mm BETWEEN 50 AND 120 AND card_height_mm BETWEEN 30 AND 90
  ),
  CONSTRAINT school_id_card_settings_orientation CHECK (print_orientation IN ('portrait','landscape')),
  CONSTRAINT school_id_card_settings_logo CHECK (logo_placement IN ('left','center','right')),
  CONSTRAINT school_id_card_settings_color CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT school_id_card_settings_disclaimer CHECK (char_length(btrim(disclaimer)) >= 40),
  CONSTRAINT school_id_card_settings_window CHECK (duplicate_scan_window_seconds BETWEEN 5 AND 300),
  CONSTRAINT school_id_card_settings_signature CHECK (
    (signature_image_url IS NULL AND signatory_name IS NULL AND signatory_designation IS NULL)
    OR (
      signature_image_url IS NOT NULL
      AND signature_image_url NOT LIKE 'data:%'
      AND char_length(signature_image_url) BETWEEN 8 AND 2000
      AND signatory_name IS NOT NULL
      AND char_length(btrim(signatory_name)) >= 2
      AND signatory_designation IS NOT NULL
      AND char_length(btrim(signatory_designation)) >= 2
    )
  ),
  CONSTRAINT school_id_card_settings_lost_email CHECK (
    lost_found_email IS NULL
    OR (
      char_length(lost_found_email) <= 254
      AND lost_found_email = btrim(lost_found_email)
      AND position('@' in lost_found_email) > 1
      AND lost_found_email !~ '\s'
    )
  )
);

COMMENT ON TABLE public.school_id_card_settings IS
  'Per-tenant ID card presentation and entry/exit notification switches. Classroom attendance is not configured here.';

CREATE OR REPLACE FUNCTION public.school_gate_settings_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := transaction_timestamp();
  END IF;
  NEW.updated_at := transaction_timestamp();
  PERFORM public.school_gate_assert_server_time(NEW.updated_at);
  IF NEW.updated_by IS NULL THEN
    RAISE EXCEPTION 'school gate: settings require updated_by';
  END IF;
  PERFORM public.school_gate_assert_school_admin(NEW.updated_by, NEW.tenant_id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_school_id_card_settings_guard ON public.school_id_card_settings;
CREATE TRIGGER trg_school_id_card_settings_guard
  BEFORE INSERT OR UPDATE ON public.school_id_card_settings
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_settings_guard();

DROP TRIGGER IF EXISTS trg_school_id_card_settings_no_delete ON public.school_id_card_settings;
CREATE TRIGGER trg_school_id_card_settings_no_delete
  BEFORE DELETE ON public.school_id_card_settings
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_append_only();

DROP TRIGGER IF EXISTS trg_school_id_card_settings_no_truncate ON public.school_id_card_settings;
CREATE TRIGGER trg_school_id_card_settings_no_truncate
  BEFORE TRUNCATE ON public.school_id_card_settings
  FOR EACH STATEMENT EXECUTE FUNCTION public.school_gate_append_only();

-- ---------------------------------------------------------------------------
-- Issued cards. The raw token is never stored. token_sha256 is SHA-256 hex.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.school_id_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  subject_type text NOT NULL CHECK (subject_type IN ('student','staff','admin')),
  student_id uuid REFERENCES public.students(id) ON DELETE RESTRICT,
  staff_id uuid REFERENCES public.tenant_staff(id) ON DELETE RESTRICT,
  admin_user_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  token_sha256 text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','revoked')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  revoke_kind text,
  replaces_card_id uuid REFERENCES public.school_id_cards(id) ON DELETE RESTRICT,
  printed_name text NOT NULL,
  printed_code text NOT NULL,
  printed_detail text,
  category text GENERATED ALWAYS AS (
    CASE subject_type
      WHEN 'student' THEN 'STUDENT'
      WHEN 'staff' THEN 'STAFF'
      WHEN 'admin' THEN 'ADMIN'
    END
  ) STORED,
  issued_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_id_cards_subject CHECK (
    (subject_type = 'student' AND student_id IS NOT NULL AND staff_id IS NULL AND admin_user_id IS NULL)
    OR (subject_type = 'staff' AND staff_id IS NOT NULL AND student_id IS NULL AND admin_user_id IS NULL)
    OR (subject_type = 'admin' AND admin_user_id IS NOT NULL AND student_id IS NULL AND staff_id IS NULL)
  ),
  CONSTRAINT school_id_cards_token CHECK (token_sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT school_id_cards_revoke_shape CHECK (
    (status IN ('pending','active') AND revoked_at IS NULL AND revoked_by IS NULL AND revoke_kind IS NULL)
    OR (status = 'revoked' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL AND revoke_kind IN ('replaced','retired'))
  ),
  CONSTRAINT school_id_cards_pending_requires_predecessor CHECK (
    status <> 'pending' OR replaces_card_id IS NOT NULL
  ),
  CONSTRAINT school_id_cards_expiry CHECK (expires_at IS NULL OR expires_at > issued_at),
  CONSTRAINT school_id_cards_replacement CHECK (
    replaces_card_id IS NULL OR replaces_card_id <> id
  ),
  CONSTRAINT school_id_cards_printed CHECK (
    char_length(btrim(printed_name)) >= 2
    AND char_length(btrim(printed_code)) >= 1
    AND char_length(printed_name) <= 200
    AND char_length(printed_code) <= 120
  )
);

COMMENT ON TABLE public.school_id_cards IS
  'Issued school ID card. Barcode secret is not stored. Classroom attendance is not created from this table.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_id_cards_token
  ON public.school_id_cards (token_sha256);

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_id_cards_active_student
  ON public.school_id_cards (tenant_id, student_id)
  WHERE status = 'active' AND student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_id_cards_active_staff
  ON public.school_id_cards (tenant_id, staff_id)
  WHERE status = 'active' AND staff_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_id_cards_active_admin
  ON public.school_id_cards (tenant_id, admin_user_id)
  WHERE status = 'active' AND admin_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_id_cards_pending_student
  ON public.school_id_cards (tenant_id, student_id)
  WHERE status = 'pending' AND student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_id_cards_pending_staff
  ON public.school_id_cards (tenant_id, staff_id)
  WHERE status = 'pending' AND staff_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_id_cards_pending_admin
  ON public.school_id_cards (tenant_id, admin_user_id)
  WHERE status = 'pending' AND admin_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_school_id_cards_tenant_status
  ON public.school_id_cards (tenant_id, status, issued_at DESC);

CREATE INDEX IF NOT EXISTS ix_school_id_cards_replaces
  ON public.school_id_cards (replaces_card_id)
  WHERE replaces_card_id IS NOT NULL;

-- Returns the active card id only when the hash belongs to this tenant.
-- A hash issued to another tenant returns NULL and does not reveal that row.
CREATE OR REPLACE FUNCTION public.school_gate_active_card_id(p_tenant_id uuid, p_token_sha256 text)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT id
  FROM public.school_id_cards
  WHERE p_tenant_id IS NOT NULL
    AND tenant_id = p_tenant_id
    AND token_sha256 = lower(btrim(coalesce(p_token_sha256, '')))
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > transaction_timestamp())
$$;

CREATE OR REPLACE FUNCTION public.school_gate_card_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_student record;
  v_staff record;
  v_admin record;
  v_values text[];
  v_previous public.school_id_cards%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.issued_at := transaction_timestamp();
    NEW.created_at := transaction_timestamp();
    NEW.revoked_at := NULL;
    NEW.revoked_by := NULL;
    NEW.revoke_kind := NULL;
    NEW.token_sha256 := lower(btrim(NEW.token_sha256));
    PERFORM public.school_gate_assert_server_time(NEW.issued_at);

    IF NOT EXISTS (
      SELECT 1 FROM public.school_id_card_settings WHERE tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'school gate: tenant has no ID card settings';
    END IF;
    PERFORM public.school_gate_assert_school_admin(NEW.issued_by, NEW.tenant_id);

    IF NEW.subject_type = 'student' THEN
      PERFORM public.school_gate_assert_student(NEW.tenant_id, NEW.student_id, true);
      SELECT id, first_name, last_name, admission_number, current_class, tenant_id
        INTO v_student
      FROM public.students
      WHERE id = NEW.student_id;
      NEW.printed_name := btrim(v_student.first_name) || ' ' || btrim(v_student.last_name);
      NEW.printed_code := btrim(v_student.admission_number);
      NEW.printed_detail := NULLIF(btrim(coalesce(v_student.current_class, '')), '');
      v_values := ARRAY[
        v_student.id::text, v_student.admission_number,
        v_student.first_name, v_student.last_name,
        btrim(v_student.first_name) || ' ' || btrim(v_student.last_name)
      ];
    ELSIF NEW.subject_type = 'staff' THEN
      PERFORM public.school_gate_assert_staff(NEW.tenant_id, NEW.staff_id, true);
      SELECT id, tenant_id, name, staff_id, role
        INTO v_staff
      FROM public.tenant_staff
      WHERE id = NEW.staff_id;
      NEW.printed_name := btrim(v_staff.name);
      NEW.printed_code := coalesce(NULLIF(btrim(coalesce(v_staff.staff_id, '')), ''), 'STAFF');
      NEW.printed_detail := NULLIF(btrim(coalesce(v_staff.role, '')), '');
      IF NEW.printed_code = v_staff.id::text THEN
        RAISE EXCEPTION 'school gate: a staff card must not print an internal identifier';
      END IF;
      v_values := ARRAY[v_staff.id::text, v_staff.staff_id, v_staff.name, v_staff.role];
    ELSE
      PERFORM public.school_gate_assert_admin_subject(NEW.tenant_id, NEW.admin_user_id);
      SELECT id, name, email, role, tenant_id
        INTO v_admin
      FROM public.users
      WHERE id = NEW.admin_user_id;
      NEW.printed_name := coalesce(NULLIF(btrim(coalesce(v_admin.name, '')), ''), 'School administrator');
      NEW.printed_code := 'ADMIN';
      NEW.printed_detail := 'School administrator';
      IF NEW.printed_code = v_admin.id::text OR lower(NEW.printed_code) = lower(v_admin.email) THEN
        RAISE EXCEPTION 'school gate: an administrator card must not print an internal identifier';
      END IF;
      v_values := ARRAY[v_admin.id::text, v_admin.email, v_admin.name, v_admin.role];
    END IF;

    PERFORM public.school_gate_reject_predictable_token(NEW.token_sha256, v_values);

    -- A replacement that must not strand the holder is inserted as pending
    -- while the current card is still active. The same transaction then
    -- revokes the current card with revoke_kind replaced and activates the
    -- pending card. A later reissue after revoke_kind retired inserts active.
    IF NEW.replaces_card_id IS NULL THEN
      NEW.status := 'active';
      RETURN NEW;
    END IF;

    SELECT * INTO v_previous
    FROM public.school_id_cards
    WHERE id = NEW.replaces_card_id;
    IF NOT FOUND
       OR v_previous.tenant_id IS DISTINCT FROM NEW.tenant_id
       OR v_previous.subject_type IS DISTINCT FROM NEW.subject_type
       OR v_previous.student_id IS DISTINCT FROM NEW.student_id
       OR v_previous.staff_id IS DISTINCT FROM NEW.staff_id
       OR v_previous.admin_user_id IS DISTINCT FROM NEW.admin_user_id THEN
      RAISE EXCEPTION 'school gate: replaces_card_id must be a card for the same person and tenant';
    END IF;
    IF v_previous.status = 'active' THEN
      NEW.status := 'pending';
    ELSIF v_previous.status = 'revoked' AND v_previous.revoke_kind = 'retired' THEN
      NEW.status := 'active';
    ELSE
      RAISE EXCEPTION 'school gate: replaces_card_id must be the active card, or a card already retired';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending' THEN
    IF NEW.status IS DISTINCT FROM 'active' THEN
      RAISE EXCEPTION 'school gate: a pending replacement can only be activated';
    END IF;
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
       OR NEW.subject_type IS DISTINCT FROM OLD.subject_type
       OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.staff_id IS DISTINCT FROM OLD.staff_id
       OR NEW.admin_user_id IS DISTINCT FROM OLD.admin_user_id
       OR NEW.token_sha256 IS DISTINCT FROM OLD.token_sha256
       OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
       OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
       OR NEW.printed_name IS DISTINCT FROM OLD.printed_name
       OR NEW.printed_code IS DISTINCT FROM OLD.printed_code
       OR NEW.printed_detail IS DISTINCT FROM OLD.printed_detail
       OR NEW.issued_by IS DISTINCT FROM OLD.issued_by
       OR NEW.replaces_card_id IS DISTINCT FROM OLD.replaces_card_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.revoked_at IS NOT NULL
       OR NEW.revoked_by IS NOT NULL
       OR NEW.revoke_kind IS NOT NULL THEN
      RAISE EXCEPTION 'school gate: activating a replacement cannot change its identity';
    END IF;
    SELECT * INTO v_previous
    FROM public.school_id_cards
    WHERE id = NEW.replaces_card_id;
    IF NOT FOUND OR v_previous.status IS DISTINCT FROM 'revoked' OR v_previous.revoke_kind IS DISTINCT FROM 'replaced' THEN
      RAISE EXCEPTION 'school gate: activate the replacement only after the current card is revoked for replacement';
    END IF;
    NEW.status := 'active';
    RETURN NEW;
  END IF;

  IF OLD.status = 'revoked' OR OLD.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'school gate: a revoked card cannot be changed';
  END IF;
  IF NEW.status IS DISTINCT FROM 'revoked' THEN
    RAISE EXCEPTION 'school gate: an active card can only be revoked';
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.subject_type IS DISTINCT FROM OLD.subject_type
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.staff_id IS DISTINCT FROM OLD.staff_id
     OR NEW.admin_user_id IS DISTINCT FROM OLD.admin_user_id
     OR NEW.token_sha256 IS DISTINCT FROM OLD.token_sha256
     OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.printed_name IS DISTINCT FROM OLD.printed_name
     OR NEW.printed_code IS DISTINCT FROM OLD.printed_code
     OR NEW.printed_detail IS DISTINCT FROM OLD.printed_detail
     OR NEW.issued_by IS DISTINCT FROM OLD.issued_by
     OR NEW.replaces_card_id IS DISTINCT FROM OLD.replaces_card_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'school gate: card identity, token, and printed snapshot are immutable';
  END IF;

  IF NEW.revoke_kind IS NULL OR NEW.revoke_kind NOT IN ('replaced','retired') THEN
    RAISE EXCEPTION 'school gate: revoke_kind must be replaced or retired';
  END IF;
  NEW.revoked_at := transaction_timestamp();
  PERFORM public.school_gate_assert_school_admin(NEW.revoked_by, NEW.tenant_id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_school_id_cards_guard ON public.school_id_cards;
CREATE TRIGGER trg_school_id_cards_guard
  BEFORE INSERT OR UPDATE ON public.school_id_cards
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_card_guard();

DROP TRIGGER IF EXISTS trg_school_id_cards_no_delete ON public.school_id_cards;
CREATE TRIGGER trg_school_id_cards_no_delete
  BEFORE DELETE ON public.school_id_cards
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_append_only();

DROP TRIGGER IF EXISTS trg_school_id_cards_no_truncate ON public.school_id_cards;
CREATE TRIGGER trg_school_id_cards_no_truncate
  BEFORE TRUNCATE ON public.school_id_cards
  FOR EACH STATEMENT EXECUTE FUNCTION public.school_gate_append_only();

-- Re-read the committed row. A deferred INSERT trigger otherwise still sees
-- the pending version from the insert statement, even after a later update
-- in the same transaction activates it.
CREATE OR REPLACE FUNCTION public.school_gate_card_commit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_kind text;
  v_replaces uuid;
  v_subject text;
  v_student uuid;
  v_staff uuid;
  v_admin uuid;
  v_prev_status text;
BEGIN
  SELECT status, revoke_kind, replaces_card_id, subject_type, student_id, staff_id, admin_user_id
    INTO v_status, v_kind, v_replaces, v_subject, v_student, v_staff, v_admin
  FROM public.school_id_cards
  WHERE id = NEW.id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_status = 'pending' THEN
    RAISE EXCEPTION 'school gate: a replacement card was not activated in the same transaction';
  END IF;

  IF v_status = 'revoked' AND v_kind = 'replaced' AND NOT EXISTS (
    SELECT 1
    FROM public.school_id_cards successor
    WHERE successor.replaces_card_id = NEW.id
      AND successor.tenant_id = NEW.tenant_id
      AND successor.status = 'active'
      AND successor.subject_type = v_subject
      AND successor.student_id IS NOT DISTINCT FROM v_student
      AND successor.staff_id IS NOT DISTINCT FROM v_staff
      AND successor.admin_user_id IS NOT DISTINCT FROM v_admin
  ) THEN
    RAISE EXCEPTION 'school gate: replacement revoke requires the new card to be active in the same transaction';
  END IF;

  IF v_replaces IS NOT NULL THEN
    SELECT status INTO v_prev_status
    FROM public.school_id_cards
    WHERE id = v_replaces;
    IF v_prev_status IS DISTINCT FROM 'revoked' THEN
      RAISE EXCEPTION 'school gate: the replaced card is still active at commit';
    END IF;
  END IF;

  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_school_id_cards_commit ON public.school_id_cards;
CREATE CONSTRAINT TRIGGER trg_school_id_cards_commit
  AFTER INSERT OR UPDATE ON public.school_id_cards
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_card_commit();

-- ---------------------------------------------------------------------------
-- Verified gate contacts. Not health guardians. Not payment customers.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.school_entry_exit_guardian_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  guardian_name text NOT NULL,
  relationship text NOT NULL CHECK (relationship IN ('mother','father','legal_guardian','other_relative','other')),
  email text NOT NULL,
  email_normalized text NOT NULL,
  consent_entry_exit boolean NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  verified_at timestamptz NOT NULL DEFAULT now(),
  verified_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_entry_exit_guardian_email CHECK (
    char_length(email) <= 254
    AND email = btrim(email)
    AND position('@' in email) > 1
    AND email !~ '\s'
    AND email_normalized = lower(email)
  ),
  CONSTRAINT school_entry_exit_guardian_name CHECK (char_length(btrim(guardian_name)) BETWEEN 2 AND 200),
  CONSTRAINT school_entry_exit_guardian_primary CHECK (
    NOT is_primary OR (consent_entry_exit AND revoked_at IS NULL)
  ),
  CONSTRAINT school_entry_exit_guardian_revoke_shape CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL)
    OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
  )
);

COMMENT ON TABLE public.school_entry_exit_guardian_contacts IS
  'School-verified guardian address for entry/exit mail only. Do not copy hw_guardian_links or customers.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_entry_exit_guardian_live_email
  ON public.school_entry_exit_guardian_contacts (tenant_id, student_id, email_normalized)
  WHERE revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_entry_exit_guardian_primary
  ON public.school_entry_exit_guardian_contacts (tenant_id, student_id)
  WHERE is_primary AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_school_entry_exit_guardian_student
  ON public.school_entry_exit_guardian_contacts (tenant_id, student_id, revoked_at);

CREATE TABLE IF NOT EXISTS public.school_staff_email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  tenant_staff_id uuid NOT NULL REFERENCES public.tenant_staff(id) ON DELETE RESTRICT,
  email text NOT NULL,
  email_normalized text NOT NULL,
  accepts_entry_exit_email boolean NOT NULL DEFAULT true,
  verified_at timestamptz NOT NULL DEFAULT now(),
  verified_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_staff_email_format CHECK (
    char_length(email) <= 254
    AND email = btrim(email)
    AND position('@' in email) > 1
    AND email !~ '\s'
    AND email_normalized = lower(email)
  ),
  CONSTRAINT school_staff_email_revoke_shape CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL)
    OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
  )
);

COMMENT ON TABLE public.school_staff_email_verifications IS
  'Verified staff mailbox for entry/exit mail. tenant_staff has no email column. users.email is not read.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_staff_email_live
  ON public.school_staff_email_verifications (tenant_id, tenant_staff_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_school_staff_email_staff
  ON public.school_staff_email_verifications (tenant_id, tenant_staff_id);

CREATE OR REPLACE FUNCTION public.school_gate_guardian_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.verified_at := transaction_timestamp();
    NEW.created_at := transaction_timestamp();
    NEW.revoked_at := NULL;
    NEW.revoked_by := NULL;
    NEW.email := btrim(NEW.email);
    NEW.email_normalized := lower(NEW.email);
    NEW.guardian_name := btrim(NEW.guardian_name);
    PERFORM public.school_gate_assert_student(NEW.tenant_id, NEW.student_id, true);
    PERFORM public.school_gate_assert_school_admin(NEW.verified_by, NEW.tenant_id);
    RETURN NEW;
  END IF;

  IF OLD.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'school gate: a revoked guardian contact cannot be changed';
  END IF;
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.guardian_name IS DISTINCT FROM OLD.guardian_name
     OR NEW.relationship IS DISTINCT FROM OLD.relationship
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.email_normalized IS DISTINCT FROM OLD.email_normalized
     OR NEW.consent_entry_exit IS DISTINCT FROM OLD.consent_entry_exit
     OR NEW.is_primary IS DISTINCT FROM OLD.is_primary
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
     OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'school gate: guardian contacts are revoked, not edited';
  END IF;
  NEW.revoked_at := transaction_timestamp();
  NEW.is_primary := false;
  PERFORM public.school_gate_assert_school_admin(NEW.revoked_by, NEW.tenant_id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_school_entry_exit_guardian_guard ON public.school_entry_exit_guardian_contacts;
CREATE TRIGGER trg_school_entry_exit_guardian_guard
  BEFORE INSERT OR UPDATE ON public.school_entry_exit_guardian_contacts
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_guardian_guard();

DROP TRIGGER IF EXISTS trg_school_entry_exit_guardian_no_delete ON public.school_entry_exit_guardian_contacts;
CREATE TRIGGER trg_school_entry_exit_guardian_no_delete
  BEFORE DELETE ON public.school_entry_exit_guardian_contacts
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_append_only();

DROP TRIGGER IF EXISTS trg_school_entry_exit_guardian_no_truncate ON public.school_entry_exit_guardian_contacts;
CREATE TRIGGER trg_school_entry_exit_guardian_no_truncate
  BEFORE TRUNCATE ON public.school_entry_exit_guardian_contacts
  FOR EACH STATEMENT EXECUTE FUNCTION public.school_gate_append_only();

CREATE OR REPLACE FUNCTION public.school_gate_staff_email_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.verified_at := transaction_timestamp();
    NEW.created_at := transaction_timestamp();
    NEW.revoked_at := NULL;
    NEW.revoked_by := NULL;
    NEW.email := btrim(NEW.email);
    NEW.email_normalized := lower(NEW.email);
    PERFORM public.school_gate_assert_staff(NEW.tenant_id, NEW.tenant_staff_id, true);
    PERFORM public.school_gate_assert_school_admin(NEW.verified_by, NEW.tenant_id);
    RETURN NEW;
  END IF;

  IF OLD.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'school gate: a revoked staff email cannot be changed';
  END IF;
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.tenant_staff_id IS DISTINCT FROM OLD.tenant_staff_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.email_normalized IS DISTINCT FROM OLD.email_normalized
     OR NEW.accepts_entry_exit_email IS DISTINCT FROM OLD.accepts_entry_exit_email
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
     OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'school gate: staff emails are revoked, not edited';
  END IF;
  NEW.revoked_at := transaction_timestamp();
  PERFORM public.school_gate_assert_school_admin(NEW.revoked_by, NEW.tenant_id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_school_staff_email_guard ON public.school_staff_email_verifications;
CREATE TRIGGER trg_school_staff_email_guard
  BEFORE INSERT OR UPDATE ON public.school_staff_email_verifications
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_staff_email_guard();

DROP TRIGGER IF EXISTS trg_school_staff_email_no_delete ON public.school_staff_email_verifications;
CREATE TRIGGER trg_school_staff_email_no_delete
  BEFORE DELETE ON public.school_staff_email_verifications
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_append_only();

DROP TRIGGER IF EXISTS trg_school_staff_email_no_truncate ON public.school_staff_email_verifications;
CREATE TRIGGER trg_school_staff_email_no_truncate
  BEFORE TRUNCATE ON public.school_staff_email_verifications
  FOR EACH STATEMENT EXECUTE FUNCTION public.school_gate_append_only();

-- ---------------------------------------------------------------------------
-- Sessions. One open session per person. Close and void are the only updates.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.school_entry_exit_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  subject_type text NOT NULL CHECK (subject_type IN ('student','staff','admin')),
  student_id uuid REFERENCES public.students(id) ON DELETE RESTRICT,
  staff_id uuid REFERENCES public.tenant_staff(id) ON DELETE RESTRICT,
  admin_user_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  card_id uuid NOT NULL REFERENCES public.school_id_cards(id) ON DELETE RESTRICT,
  origin text NOT NULL CHECK (origin IN ('scan','correction')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  voided_at timestamptz,
  close_source text CHECK (close_source IN ('scan','correction')),
  opened_by_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  closed_by_user_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  voided_by_user_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  device_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_entry_exit_session_subject CHECK (
    (subject_type = 'student' AND student_id IS NOT NULL AND staff_id IS NULL AND admin_user_id IS NULL)
    OR (subject_type = 'staff' AND staff_id IS NOT NULL AND student_id IS NULL AND admin_user_id IS NULL)
    OR (subject_type = 'admin' AND admin_user_id IS NOT NULL AND student_id IS NULL AND staff_id IS NULL)
  ),
  CONSTRAINT school_entry_exit_session_times CHECK (
    (closed_at IS NULL OR closed_at >= opened_at)
    AND (voided_at IS NULL OR closed_at IS NULL)
  ),
  CONSTRAINT school_entry_exit_session_close_shape CHECK (
    (closed_at IS NULL AND close_source IS NULL AND closed_by_user_id IS NULL)
    OR (closed_at IS NOT NULL AND close_source IS NOT NULL AND closed_by_user_id IS NOT NULL)
  ),
  CONSTRAINT school_entry_exit_session_void_shape CHECK (
    (voided_at IS NULL AND voided_by_user_id IS NULL)
    OR (voided_at IS NOT NULL AND voided_by_user_id IS NOT NULL)
  ),
  CONSTRAINT school_entry_exit_session_device CHECK (
    device_label IS NULL OR char_length(device_label) BETWEEN 1 AND 120
  )
);

COMMENT ON TABLE public.school_entry_exit_sessions IS
  'School arrival and departure sessions. Independent of attendance_records and student_attendance.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_entry_exit_one_open_student
  ON public.school_entry_exit_sessions (tenant_id, student_id)
  WHERE closed_at IS NULL AND voided_at IS NULL AND student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_entry_exit_one_open_staff
  ON public.school_entry_exit_sessions (tenant_id, staff_id)
  WHERE closed_at IS NULL AND voided_at IS NULL AND staff_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_entry_exit_one_open_admin
  ON public.school_entry_exit_sessions (tenant_id, admin_user_id)
  WHERE closed_at IS NULL AND voided_at IS NULL AND admin_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_school_entry_exit_sessions_tenant_opened
  ON public.school_entry_exit_sessions (tenant_id, opened_at DESC);

CREATE INDEX IF NOT EXISTS ix_school_entry_exit_sessions_card
  ON public.school_entry_exit_sessions (card_id);

CREATE OR REPLACE FUNCTION public.school_gate_session_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_card public.school_id_cards%ROWTYPE;
  v_track_admin boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.opened_at := transaction_timestamp();
    NEW.created_at := transaction_timestamp();
    NEW.closed_at := NULL;
    NEW.voided_at := NULL;
    NEW.close_source := NULL;
    NEW.closed_by_user_id := NULL;
    NEW.voided_by_user_id := NULL;
    PERFORM public.school_gate_assert_server_time(NEW.opened_at);

    SELECT * INTO v_card FROM public.school_id_cards WHERE id = NEW.card_id;
    IF NOT FOUND
       OR v_card.tenant_id IS DISTINCT FROM NEW.tenant_id
       OR v_card.subject_type IS DISTINCT FROM NEW.subject_type
       OR v_card.student_id IS DISTINCT FROM NEW.student_id
       OR v_card.staff_id IS DISTINCT FROM NEW.staff_id
       OR v_card.admin_user_id IS DISTINCT FROM NEW.admin_user_id
       OR v_card.status IS DISTINCT FROM 'active'
       OR (v_card.expires_at IS NOT NULL AND v_card.expires_at <= transaction_timestamp()) THEN
      RAISE EXCEPTION 'school gate: session requires an active unexpired card for the same person and tenant';
    END IF;

    IF NEW.subject_type = 'student' THEN
      PERFORM public.school_gate_assert_student(NEW.tenant_id, NEW.student_id, true);
    ELSIF NEW.subject_type = 'staff' THEN
      PERFORM public.school_gate_assert_staff(NEW.tenant_id, NEW.staff_id, true);
    ELSE
      SELECT track_admin_entry INTO v_track_admin
      FROM public.school_id_card_settings
      WHERE tenant_id = NEW.tenant_id;
      IF v_track_admin IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'school gate: administrator entry tracking is not enabled';
      END IF;
      PERFORM public.school_gate_assert_admin_subject(NEW.tenant_id, NEW.admin_user_id);
    END IF;

    IF NEW.origin = 'correction' THEN
      PERFORM public.school_gate_assert_school_admin(NEW.opened_by_user_id, NEW.tenant_id);
    ELSE
      PERFORM public.school_gate_assert_scan_operator(NEW.opened_by_user_id, NEW.tenant_id);
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.closed_at IS NOT NULL OR OLD.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'school gate: a closed or voided session cannot be changed';
  END IF;
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.subject_type IS DISTINCT FROM OLD.subject_type
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.staff_id IS DISTINCT FROM OLD.staff_id
     OR NEW.admin_user_id IS DISTINCT FROM OLD.admin_user_id
     OR NEW.card_id IS DISTINCT FROM OLD.card_id
     OR NEW.origin IS DISTINCT FROM OLD.origin
     OR NEW.opened_at IS DISTINCT FROM OLD.opened_at
     OR NEW.opened_by_user_id IS DISTINCT FROM OLD.opened_by_user_id
     OR NEW.device_label IS DISTINCT FROM OLD.device_label
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'school gate: session identity and arrival time are immutable';
  END IF;

  IF NEW.closed_at IS NOT NULL AND NEW.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'school gate: a session cannot be closed and voided together';
  END IF;

  IF NEW.voided_at IS NOT NULL THEN
    NEW.voided_at := transaction_timestamp();
    NEW.closed_at := NULL;
    NEW.close_source := NULL;
    NEW.closed_by_user_id := NULL;
    PERFORM public.school_gate_assert_school_admin(NEW.voided_by_user_id, NEW.tenant_id);
    RETURN NEW;
  END IF;

  IF NEW.closed_at IS NULL THEN
    RAISE EXCEPTION 'school gate: an open session can only be closed or voided';
  END IF;
  NEW.closed_at := transaction_timestamp();
  IF NEW.close_source = 'correction' THEN
    PERFORM public.school_gate_assert_school_admin(NEW.closed_by_user_id, NEW.tenant_id);
  ELSIF NEW.close_source = 'scan' THEN
    SELECT * INTO v_card FROM public.school_id_cards WHERE id = NEW.card_id;
    IF NOT FOUND
       OR v_card.status IS DISTINCT FROM 'active'
       OR (v_card.expires_at IS NOT NULL AND v_card.expires_at <= transaction_timestamp()) THEN
      RAISE EXCEPTION 'school gate: a revoked or expired card cannot authorize a clock-out scan';
    END IF;
    PERFORM public.school_gate_assert_scan_operator(NEW.closed_by_user_id, NEW.tenant_id);
  ELSE
    RAISE EXCEPTION 'school gate: close_source is required';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_school_entry_exit_session_guard ON public.school_entry_exit_sessions;
CREATE TRIGGER trg_school_entry_exit_session_guard
  BEFORE INSERT OR UPDATE ON public.school_entry_exit_sessions
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_session_guard();

DROP TRIGGER IF EXISTS trg_school_entry_exit_session_no_delete ON public.school_entry_exit_sessions;
CREATE TRIGGER trg_school_entry_exit_session_no_delete
  BEFORE DELETE ON public.school_entry_exit_sessions
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_append_only();

DROP TRIGGER IF EXISTS trg_school_entry_exit_session_no_truncate ON public.school_entry_exit_sessions;
CREATE TRIGGER trg_school_entry_exit_session_no_truncate
  BEFORE TRUNCATE ON public.school_entry_exit_sessions
  FOR EACH STATEMENT EXECUTE FUNCTION public.school_gate_append_only();

-- ---------------------------------------------------------------------------
-- Append-only scan and correction events.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.school_entry_exit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  session_id uuid REFERENCES public.school_entry_exit_sessions(id) ON DELETE RESTRICT,
  card_id uuid REFERENCES public.school_id_cards(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN (
    'arrival_accepted',
    'departure_accepted',
    'correction_arrival',
    'correction_departure',
    'session_voided',
    'duplicate_open',
    'duplicate_window',
    'departure_without_session',
    'unknown_token',
    'revoked_card',
    'expired_card',
    'inactive_subject',
    'tracking_disabled'
  )),
  subject_type text CHECK (subject_type IN ('student','staff','admin')),
  student_id uuid REFERENCES public.students(id) ON DELETE RESTRICT,
  staff_id uuid REFERENCES public.tenant_staff(id) ON DELETE RESTRICT,
  admin_user_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  token_sha256 text,
  actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  reason text,
  device_label text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_entry_exit_event_token CHECK (
    token_sha256 IS NULL OR token_sha256 ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT school_entry_exit_event_reason CHECK (
    reason IS NULL OR char_length(btrim(reason)) BETWEEN 5 AND 500
  ),
  CONSTRAINT school_entry_exit_event_device CHECK (
    device_label IS NULL OR char_length(device_label) BETWEEN 1 AND 120
  ),
  CONSTRAINT school_entry_exit_event_subject CHECK (
    subject_type IS NULL
    OR (
      (subject_type = 'student' AND student_id IS NOT NULL AND staff_id IS NULL AND admin_user_id IS NULL)
      OR (subject_type = 'staff' AND staff_id IS NOT NULL AND student_id IS NULL AND admin_user_id IS NULL)
      OR (subject_type = 'admin' AND admin_user_id IS NOT NULL AND student_id IS NULL AND staff_id IS NULL)
    )
  )
);

COMMENT ON TABLE public.school_entry_exit_events IS
  'Append-only entry/exit scan log. token_sha256 is a hash. The raw barcode secret is not stored.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_entry_exit_one_opening_event
  ON public.school_entry_exit_events (session_id)
  WHERE action IN ('arrival_accepted','correction_arrival') AND session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_entry_exit_one_closing_event
  ON public.school_entry_exit_events (session_id)
  WHERE action IN ('departure_accepted','correction_departure') AND session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_entry_exit_one_void_event
  ON public.school_entry_exit_events (session_id)
  WHERE action = 'session_voided' AND session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_school_entry_exit_events_tenant_time
  ON public.school_entry_exit_events (tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS ix_school_entry_exit_events_session
  ON public.school_entry_exit_events (session_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.school_gate_event_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_session public.school_entry_exit_sessions%ROWTYPE;
  v_card public.school_id_cards%ROWTYPE;
  v_needs_session boolean;
  v_needs_reason boolean;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'school gate: events are append-only';
  END IF;

  NEW.occurred_at := transaction_timestamp();
  IF NEW.token_sha256 IS NOT NULL THEN
    NEW.token_sha256 := lower(btrim(NEW.token_sha256));
  END IF;
  PERFORM public.school_gate_assert_server_time(NEW.occurred_at);

  v_needs_session := NEW.action IN (
    'arrival_accepted','departure_accepted','correction_arrival',
    'correction_departure','session_voided','duplicate_open','duplicate_window'
  );
  v_needs_reason := NEW.action IN (
    'correction_arrival','correction_departure','session_voided'
  );

  IF v_needs_session AND NEW.session_id IS NULL THEN
    RAISE EXCEPTION 'school gate: % requires a session', NEW.action;
  END IF;
  IF NOT v_needs_session AND NEW.session_id IS NOT NULL THEN
    RAISE EXCEPTION 'school gate: % must not attach a session', NEW.action;
  END IF;
  IF v_needs_reason AND (NEW.reason IS NULL OR char_length(btrim(NEW.reason)) < 5) THEN
    RAISE EXCEPTION 'school gate: % requires a reason', NEW.action;
  END IF;
  IF NEW.action = 'unknown_token' THEN
    IF NEW.token_sha256 IS NULL THEN
      RAISE EXCEPTION 'school gate: an unknown token stores only its hash';
    END IF;
    NEW.session_id := NULL;
    NEW.card_id := NULL;
    NEW.subject_type := NULL;
    NEW.student_id := NULL;
    NEW.staff_id := NULL;
    NEW.admin_user_id := NULL;
  END IF;

  IF NEW.action IN (
    'revoked_card','expired_card','inactive_subject','tracking_disabled','departure_without_session'
  ) AND NEW.card_id IS NULL THEN
    RAISE EXCEPTION 'school gate: % requires a card in this tenant', NEW.action;
  END IF;

  IF NEW.session_id IS NOT NULL THEN
    SELECT * INTO v_session FROM public.school_entry_exit_sessions WHERE id = NEW.session_id;
    IF NOT FOUND OR v_session.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'school gate: event tenant does not match the session';
    END IF;
    NEW.subject_type := v_session.subject_type;
    NEW.student_id := v_session.student_id;
    NEW.staff_id := v_session.staff_id;
    NEW.admin_user_id := v_session.admin_user_id;
    NEW.card_id := v_session.card_id;

    IF NEW.action = 'arrival_accepted' AND (
      v_session.origin IS DISTINCT FROM 'scan' OR NEW.occurred_at IS DISTINCT FROM v_session.opened_at
    ) THEN
      RAISE EXCEPTION 'school gate: arrival event must match the scan session open time';
    END IF;
    IF NEW.action = 'correction_arrival' AND (
      v_session.origin IS DISTINCT FROM 'correction' OR NEW.occurred_at IS DISTINCT FROM v_session.opened_at
    ) THEN
      RAISE EXCEPTION 'school gate: correction arrival must match the correction session';
    END IF;
    IF NEW.action = 'departure_accepted' AND (
      v_session.close_source IS DISTINCT FROM 'scan' OR v_session.closed_at IS NULL
      OR NEW.occurred_at IS DISTINCT FROM v_session.closed_at
    ) THEN
      RAISE EXCEPTION 'school gate: departure event must match a scan close in the same transaction';
    END IF;
    IF NEW.action = 'correction_departure' AND (
      v_session.close_source IS DISTINCT FROM 'correction' OR v_session.closed_at IS NULL
      OR NEW.occurred_at IS DISTINCT FROM v_session.closed_at
    ) THEN
      RAISE EXCEPTION 'school gate: correction departure must match a correction close';
    END IF;
    IF NEW.action = 'session_voided' AND (
      v_session.voided_at IS NULL OR NEW.occurred_at IS DISTINCT FROM v_session.voided_at
    ) THEN
      RAISE EXCEPTION 'school gate: void event must match a voided session';
    END IF;
    IF NEW.action IN ('correction_arrival','correction_departure','session_voided') THEN
      PERFORM public.school_gate_assert_school_admin(NEW.actor_user_id, NEW.tenant_id);
    ELSE
      PERFORM public.school_gate_assert_scan_operator(NEW.actor_user_id, NEW.tenant_id);
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.card_id IS NOT NULL THEN
    SELECT * INTO v_card FROM public.school_id_cards WHERE id = NEW.card_id;
    IF NOT FOUND OR v_card.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'school gate: event card is not available in this tenant';
    END IF;
    NEW.subject_type := v_card.subject_type;
    NEW.student_id := v_card.student_id;
    NEW.staff_id := v_card.staff_id;
    NEW.admin_user_id := v_card.admin_user_id;
    IF NEW.action = 'revoked_card' AND v_card.status IS DISTINCT FROM 'revoked' THEN
      RAISE EXCEPTION 'school gate: revoked_card requires a revoked card';
    END IF;
    IF NEW.action = 'expired_card' AND (
      v_card.expires_at IS NULL OR v_card.expires_at > transaction_timestamp()
    ) THEN
      RAISE EXCEPTION 'school gate: expired_card requires an expired card';
    END IF;
  END IF;

  PERFORM public.school_gate_assert_scan_operator(NEW.actor_user_id, NEW.tenant_id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_school_entry_exit_event_guard ON public.school_entry_exit_events;
CREATE TRIGGER trg_school_entry_exit_event_guard
  BEFORE INSERT ON public.school_entry_exit_events
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_event_guard();

DROP TRIGGER IF EXISTS trg_school_entry_exit_event_no_update ON public.school_entry_exit_events;
CREATE TRIGGER trg_school_entry_exit_event_no_update
  BEFORE UPDATE OR DELETE ON public.school_entry_exit_events
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_append_only();

DROP TRIGGER IF EXISTS trg_school_entry_exit_event_no_truncate ON public.school_entry_exit_events;
CREATE TRIGGER trg_school_entry_exit_event_no_truncate
  BEFORE TRUNCATE ON public.school_entry_exit_events
  FOR EACH STATEMENT EXECUTE FUNCTION public.school_gate_append_only();

-- A session cannot commit without its matching opening event.
-- A close or void cannot commit without its matching event.
-- Notification rows are intentionally not required here.
CREATE OR REPLACE FUNCTION public.school_gate_session_event_required()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_open text;
  v_close text;
BEGIN
  IF NEW.origin = 'scan' THEN
    v_open := 'arrival_accepted';
  ELSE
    v_open := 'correction_arrival';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.school_entry_exit_events
    WHERE session_id = NEW.id AND tenant_id = NEW.tenant_id AND action = v_open
  ) THEN
    RAISE EXCEPTION 'school gate: session % has no % event', NEW.id, v_open;
  END IF;

  IF NEW.closed_at IS NOT NULL THEN
    v_close := CASE NEW.close_source WHEN 'scan' THEN 'departure_accepted' ELSE 'correction_departure' END;
    IF NOT EXISTS (
      SELECT 1 FROM public.school_entry_exit_events
      WHERE session_id = NEW.id AND tenant_id = NEW.tenant_id AND action = v_close
    ) THEN
      RAISE EXCEPTION 'school gate: closed session % has no % event', NEW.id, v_close;
    END IF;
  END IF;

  IF NEW.voided_at IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.school_entry_exit_events
    WHERE session_id = NEW.id AND tenant_id = NEW.tenant_id AND action = 'session_voided'
  ) THEN
    RAISE EXCEPTION 'school gate: voided session % has no session_voided event', NEW.id;
  END IF;

  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_school_entry_exit_session_event_required ON public.school_entry_exit_sessions;
CREATE CONSTRAINT TRIGGER trg_school_entry_exit_session_event_required
  AFTER INSERT OR UPDATE ON public.school_entry_exit_sessions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_session_event_required();

-- ---------------------------------------------------------------------------
-- Audit for settings, cards, contacts, and corrections. Scans stay on events.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.school_gate_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN (
    'settings_saved',
    'card_issued',
    'card_revoked',
    'guardian_contact_verified',
    'guardian_contact_revoked',
    'staff_email_verified',
    'staff_email_revoked',
    'session_corrected'
  )),
  card_id uuid REFERENCES public.school_id_cards(id) ON DELETE RESTRICT,
  session_id uuid REFERENCES public.school_entry_exit_sessions(id) ON DELETE RESTRICT,
  guardian_contact_id uuid REFERENCES public.school_entry_exit_guardian_contacts(id) ON DELETE RESTRICT,
  staff_email_id uuid REFERENCES public.school_staff_email_verifications(id) ON DELETE RESTRICT,
  reason text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_gate_audit_reason CHECK (
    (
      action IN ('card_revoked','guardian_contact_revoked','staff_email_revoked','session_corrected')
      AND reason IS NOT NULL
      AND char_length(btrim(reason)) BETWEEN 5 AND 500
    )
    OR (
      action IN ('settings_saved','card_issued','guardian_contact_verified','staff_email_verified')
      AND (reason IS NULL OR char_length(btrim(reason)) BETWEEN 5 AND 500)
    )
  )
);

COMMENT ON TABLE public.school_gate_audit_events IS
  'Append-only audit for ID card settings, card issue and revocation, verified contacts, and session corrections.';

CREATE INDEX IF NOT EXISTS ix_school_gate_audit_tenant
  ON public.school_gate_audit_events (tenant_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.school_gate_audit_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'school gate: audit events are append-only';
  END IF;
  NEW.occurred_at := transaction_timestamp();
  PERFORM public.school_gate_assert_school_admin(NEW.actor_user_id, NEW.tenant_id);

  IF NEW.action = 'card_issued' AND NEW.card_id IS NULL THEN
    RAISE EXCEPTION 'school gate: card_issued audit requires card_id';
  END IF;
  IF NEW.action = 'card_revoked' AND NEW.card_id IS NULL THEN
    RAISE EXCEPTION 'school gate: card_revoked audit requires card_id';
  END IF;
  IF NEW.action = 'guardian_contact_verified' AND NEW.guardian_contact_id IS NULL THEN
    RAISE EXCEPTION 'school gate: guardian verification audit requires guardian_contact_id';
  END IF;
  IF NEW.action = 'guardian_contact_revoked' AND NEW.guardian_contact_id IS NULL THEN
    RAISE EXCEPTION 'school gate: guardian revocation audit requires guardian_contact_id';
  END IF;
  IF NEW.action = 'staff_email_verified' AND NEW.staff_email_id IS NULL THEN
    RAISE EXCEPTION 'school gate: staff email audit requires staff_email_id';
  END IF;
  IF NEW.action = 'staff_email_revoked' AND NEW.staff_email_id IS NULL THEN
    RAISE EXCEPTION 'school gate: staff email revocation audit requires staff_email_id';
  END IF;
  IF NEW.action = 'session_corrected' AND NEW.session_id IS NULL THEN
    RAISE EXCEPTION 'school gate: session correction audit requires session_id';
  END IF;
  IF NEW.action = 'settings_saved' AND (
    NEW.card_id IS NOT NULL OR NEW.session_id IS NOT NULL
    OR NEW.guardian_contact_id IS NOT NULL OR NEW.staff_email_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'school gate: settings audit does not reference a person';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_school_gate_audit_guard ON public.school_gate_audit_events;
CREATE TRIGGER trg_school_gate_audit_guard
  BEFORE INSERT ON public.school_gate_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_audit_guard();

DROP TRIGGER IF EXISTS trg_school_gate_audit_no_update ON public.school_gate_audit_events;
CREATE TRIGGER trg_school_gate_audit_no_update
  BEFORE UPDATE OR DELETE ON public.school_gate_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_append_only();

DROP TRIGGER IF EXISTS trg_school_gate_audit_no_truncate ON public.school_gate_audit_events;
CREATE TRIGGER trg_school_gate_audit_no_truncate
  BEFORE TRUNCATE ON public.school_gate_audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION public.school_gate_append_only();

CREATE OR REPLACE FUNCTION public.school_gate_audit_required()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_actor uuid;
BEGIN
  IF TG_TABLE_NAME = 'school_id_card_settings' THEN
    v_action := 'settings_saved';
    v_actor := NEW.updated_by;
    IF NOT EXISTS (
      SELECT 1 FROM public.school_gate_audit_events
      WHERE tenant_id = NEW.tenant_id
        AND action = v_action
        AND actor_user_id = v_actor
        AND occurred_at >= transaction_timestamp() - interval '2 seconds'
    ) THEN
      RAISE EXCEPTION 'school gate: settings change requires settings_saved audit in the same transaction';
    END IF;
    RETURN NULL;
  END IF;

  IF TG_TABLE_NAME = 'school_id_cards' THEN
    IF TG_OP = 'INSERT' THEN
      v_action := 'card_issued';
      v_actor := NEW.issued_by;
    ELSIF OLD.status IS DISTINCT FROM 'revoked' AND NEW.status = 'revoked' THEN
      v_action := 'card_revoked';
      v_actor := NEW.revoked_by;
    ELSE
      RETURN NULL;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.school_gate_audit_events
      WHERE tenant_id = NEW.tenant_id
        AND action = v_action
        AND card_id = NEW.id
        AND actor_user_id = v_actor
        AND occurred_at >= transaction_timestamp() - interval '2 seconds'
    ) THEN
      RAISE EXCEPTION 'school gate: % requires an audit event in the same transaction', v_action;
    END IF;
    RETURN NULL;
  END IF;

  IF TG_TABLE_NAME = 'school_entry_exit_guardian_contacts' THEN
    IF TG_OP = 'INSERT' THEN
      v_action := 'guardian_contact_verified';
      v_actor := NEW.verified_by;
    ELSIF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
      v_action := 'guardian_contact_revoked';
      v_actor := NEW.revoked_by;
    ELSE
      RETURN NULL;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.school_gate_audit_events
      WHERE tenant_id = NEW.tenant_id
        AND action = v_action
        AND guardian_contact_id = NEW.id
        AND actor_user_id = v_actor
        AND occurred_at >= transaction_timestamp() - interval '2 seconds'
    ) THEN
      RAISE EXCEPTION 'school gate: % requires an audit event in the same transaction', v_action;
    END IF;
    RETURN NULL;
  END IF;

  IF TG_TABLE_NAME = 'school_staff_email_verifications' THEN
    IF TG_OP = 'INSERT' THEN
      v_action := 'staff_email_verified';
      v_actor := NEW.verified_by;
    ELSIF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
      v_action := 'staff_email_revoked';
      v_actor := NEW.revoked_by;
    ELSE
      RETURN NULL;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.school_gate_audit_events
      WHERE tenant_id = NEW.tenant_id
        AND action = v_action
        AND staff_email_id = NEW.id
        AND actor_user_id = v_actor
        AND occurred_at >= transaction_timestamp() - interval '2 seconds'
    ) THEN
      RAISE EXCEPTION 'school gate: % requires an audit event in the same transaction', v_action;
    END IF;
    RETURN NULL;
  END IF;

  IF TG_TABLE_NAME = 'school_entry_exit_sessions' THEN
    IF NEW.origin = 'correction'
       OR (NEW.closed_at IS NOT NULL AND NEW.close_source = 'correction')
       OR NEW.voided_at IS NOT NULL THEN
      v_actor := COALESCE(NEW.voided_by_user_id, NEW.closed_by_user_id, NEW.opened_by_user_id);
      IF NOT EXISTS (
        SELECT 1 FROM public.school_gate_audit_events
        WHERE tenant_id = NEW.tenant_id
          AND action = 'session_corrected'
          AND session_id = NEW.id
          AND actor_user_id = v_actor
          AND occurred_at >= transaction_timestamp() - interval '2 seconds'
      ) THEN
        RAISE EXCEPTION 'school gate: a correction requires session_corrected audit in the same transaction';
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_school_id_card_settings_audit ON public.school_id_card_settings;
CREATE CONSTRAINT TRIGGER trg_school_id_card_settings_audit
  AFTER INSERT OR UPDATE ON public.school_id_card_settings
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_audit_required();

DROP TRIGGER IF EXISTS trg_school_id_cards_audit ON public.school_id_cards;
CREATE CONSTRAINT TRIGGER trg_school_id_cards_audit
  AFTER INSERT OR UPDATE ON public.school_id_cards
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_audit_required();

DROP TRIGGER IF EXISTS trg_school_entry_exit_guardian_audit ON public.school_entry_exit_guardian_contacts;
CREATE CONSTRAINT TRIGGER trg_school_entry_exit_guardian_audit
  AFTER INSERT OR UPDATE ON public.school_entry_exit_guardian_contacts
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_audit_required();

DROP TRIGGER IF EXISTS trg_school_staff_email_audit ON public.school_staff_email_verifications;
CREATE CONSTRAINT TRIGGER trg_school_staff_email_audit
  AFTER INSERT OR UPDATE ON public.school_staff_email_verifications
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_audit_required();

DROP TRIGGER IF EXISTS trg_school_entry_exit_session_audit ON public.school_entry_exit_sessions;
CREATE CONSTRAINT TRIGGER trg_school_entry_exit_session_audit
  AFTER INSERT OR UPDATE ON public.school_entry_exit_sessions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_audit_required();

-- ---------------------------------------------------------------------------
-- Notification attempts. One row per session, direction, and recipient.
-- Retries update that row. They do not insert another session.
-- status "sent" means SMTP accepted the message, not mailbox delivery.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.school_entry_exit_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL REFERENCES public.school_entry_exit_sessions(id) ON DELETE RESTRICT,
  direction text NOT NULL CHECK (direction IN ('arrival','departure')),
  guardian_contact_id uuid REFERENCES public.school_entry_exit_guardian_contacts(id) ON DELETE RESTRICT,
  staff_email_id uuid REFERENCES public.school_staff_email_verifications(id) ON DELETE RESTRICT,
  recipient_email text,
  status text NOT NULL CHECK (status IN ('queued','sent','failed','skipped')),
  skip_reason text,
  attempt_count integer NOT NULL DEFAULT 1,
  last_error_code text,
  provider_message_id text,
  provider_accepted_at timestamptz,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  idempotency_key text GENERATED ALWAYS AS (
    session_id::text || ':' || direction || ':' ||
    coalesce(guardian_contact_id::text, staff_email_id::text, 'none')
  ) STORED,
  CONSTRAINT uq_school_entry_exit_notification_key UNIQUE (idempotency_key),
  CONSTRAINT school_entry_exit_notification_recipient CHECK (
    (
      status = 'skipped'
      AND guardian_contact_id IS NULL
      AND staff_email_id IS NULL
      AND recipient_email IS NULL
      AND skip_reason IN ('no_verified_recipient','notifications_disabled','no_consent','invalid_recipient')
    )
    OR (
      status <> 'skipped'
      AND recipient_email IS NOT NULL
      AND skip_reason IS NULL
      AND (
        (guardian_contact_id IS NOT NULL AND staff_email_id IS NULL)
        OR (guardian_contact_id IS NULL AND staff_email_id IS NOT NULL)
      )
    )
  ),
  CONSTRAINT school_entry_exit_notification_attempts CHECK (attempt_count BETWEEN 1 AND 8),
  CONSTRAINT school_entry_exit_notification_error CHECK (
    (
      status = 'failed'
      AND last_error_code IN ('smtp_unavailable','smtp_rejected','recipient_rejected','unknown')
    )
    OR (
      status <> 'failed'
      AND (
        last_error_code IS NULL
        OR last_error_code IN ('smtp_unavailable','smtp_rejected','recipient_rejected','unknown')
      )
    )
  ),
  CONSTRAINT school_entry_exit_notification_provider CHECK (
    (status = 'sent' AND provider_accepted_at IS NOT NULL)
    OR (status <> 'sent' AND provider_accepted_at IS NULL)
  ),
  CONSTRAINT school_entry_exit_notification_provider_id CHECK (
    provider_message_id IS NULL OR char_length(provider_message_id) BETWEEN 1 AND 200
  ),
  CONSTRAINT school_entry_exit_notification_email CHECK (
    recipient_email IS NULL
    OR (
      char_length(recipient_email) <= 254
      AND position('@' in recipient_email) > 1
      AND recipient_email !~ '\s'
    )
  )
);

COMMENT ON TABLE public.school_entry_exit_notifications IS
  'Entry/exit mail attempts. sent means the SMTP server accepted the message. It does not mean the mailbox confirmed delivery. A missing row means no attempt has been recorded.';

CREATE INDEX IF NOT EXISTS ix_school_entry_exit_notifications_tenant
  ON public.school_entry_exit_notifications (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_school_entry_exit_notifications_session
  ON public.school_entry_exit_notifications (session_id, direction);

CREATE OR REPLACE FUNCTION public.school_gate_notification_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_session public.school_entry_exit_sessions%ROWTYPE;
  v_settings public.school_id_card_settings%ROWTYPE;
  v_guardian public.school_entry_exit_guardian_contacts%ROWTYPE;
  v_staff_email public.school_staff_email_verifications%ROWTYPE;
  v_enabled boolean;
BEGIN
  SELECT * INTO v_session FROM public.school_entry_exit_sessions WHERE id = NEW.session_id;
  IF NOT FOUND OR v_session.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'school gate: notification tenant does not match the session';
  END IF;
  IF v_session.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'school gate: a voided session has no notification';
  END IF;
  IF NEW.direction = 'departure' AND v_session.closed_at IS NULL THEN
    RAISE EXCEPTION 'school gate: a departure notification requires a closed session';
  END IF;

  SELECT * INTO v_settings FROM public.school_id_card_settings WHERE tenant_id = NEW.tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'school gate: notification settings are missing';
  END IF;

  v_enabled := CASE
    WHEN v_session.subject_type = 'student' AND NEW.direction = 'arrival' THEN v_settings.notify_student_arrival
    WHEN v_session.subject_type = 'student' AND NEW.direction = 'departure' THEN v_settings.notify_student_departure
    WHEN v_session.subject_type = 'staff' AND NEW.direction = 'arrival' THEN v_settings.notify_staff_arrival
    WHEN v_session.subject_type = 'staff' AND NEW.direction = 'departure' THEN v_settings.notify_staff_departure
    ELSE false
  END;

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := transaction_timestamp();
    NEW.updated_at := transaction_timestamp();
    NEW.provider_accepted_at := NULL;
    IF NEW.status = 'sent' THEN
      RAISE EXCEPTION 'school gate: a notification is queued or skipped before it is sent';
    END IF;
  ELSE
    IF OLD.status IN ('sent','skipped') THEN
      RAISE EXCEPTION 'school gate: a sent or skipped notification cannot be changed';
    END IF;
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
       OR NEW.session_id IS DISTINCT FROM OLD.session_id
       OR NEW.direction IS DISTINCT FROM OLD.direction
       OR NEW.guardian_contact_id IS DISTINCT FROM OLD.guardian_contact_id
       OR NEW.staff_email_id IS DISTINCT FROM OLD.staff_email_id
       OR NEW.recipient_email IS DISTINCT FROM OLD.recipient_email
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'school gate: notification identity is immutable';
    END IF;
    IF OLD.status = 'queued' AND NEW.status NOT IN ('queued','sent','failed') THEN
      RAISE EXCEPTION 'school gate: queued notifications cannot be skipped after insert';
    END IF;
    IF OLD.status = 'failed' AND NEW.status NOT IN ('failed','queued') THEN
      RAISE EXCEPTION 'school gate: a failed notification can only be queued again';
    END IF;
    IF OLD.status = 'failed' AND NEW.status = 'queued' AND NEW.attempt_count <= OLD.attempt_count THEN
      RAISE EXCEPTION 'school gate: a retry must increase attempt_count';
    END IF;
    IF NEW.attempt_count < OLD.attempt_count THEN
      RAISE EXCEPTION 'school gate: attempt_count cannot decrease';
    END IF;
    NEW.updated_at := transaction_timestamp();
    IF NEW.status = 'sent' THEN
      NEW.provider_accepted_at := transaction_timestamp();
      NEW.next_retry_at := NULL;
      NEW.last_error_code := NULL;
    ELSE
      NEW.provider_accepted_at := NULL;
    END IF;
    -- A retry or an SMTP acceptance must still point at the same eligible contact.
    -- Recording failure stays possible after revocation.
    IF NEW.status IN ('queued','sent') THEN
      IF NEW.guardian_contact_id IS NOT NULL THEN
        SELECT * INTO v_guardian
        FROM public.school_entry_exit_guardian_contacts
        WHERE id = NEW.guardian_contact_id;
        IF NOT FOUND
           OR v_guardian.tenant_id IS DISTINCT FROM NEW.tenant_id
           OR v_guardian.student_id IS DISTINCT FROM v_session.student_id
           OR v_guardian.revoked_at IS NOT NULL
           OR v_guardian.consent_entry_exit IS DISTINCT FROM true
           OR lower(v_guardian.email) IS DISTINCT FROM lower(NEW.recipient_email) THEN
          RAISE EXCEPTION 'school gate: guardian contact is no longer eligible for this notification';
        END IF;
      ELSIF NEW.staff_email_id IS NOT NULL THEN
        SELECT * INTO v_staff_email
        FROM public.school_staff_email_verifications
        WHERE id = NEW.staff_email_id;
        IF NOT FOUND
           OR v_staff_email.tenant_id IS DISTINCT FROM NEW.tenant_id
           OR v_staff_email.tenant_staff_id IS DISTINCT FROM v_session.staff_id
           OR v_staff_email.revoked_at IS NOT NULL
           OR v_staff_email.accepts_entry_exit_email IS DISTINCT FROM true
           OR lower(v_staff_email.email) IS DISTINCT FROM lower(NEW.recipient_email) THEN
          RAISE EXCEPTION 'school gate: staff email is no longer eligible for this notification';
        END IF;
      ELSE
        RAISE EXCEPTION 'school gate: a queued or sent notification requires its original recipient';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF v_session.subject_type = 'admin' THEN
    IF NEW.status IS DISTINCT FROM 'skipped' OR NEW.skip_reason IS DISTINCT FROM 'no_verified_recipient' THEN
      RAISE EXCEPTION 'school gate: administrator sessions have no verified entry/exit mailbox';
    END IF;
    NEW.recipient_email := NULL;
    NEW.guardian_contact_id := NULL;
    NEW.staff_email_id := NULL;
    RETURN NEW;
  END IF;

  IF NOT v_enabled THEN
    IF NEW.status IS DISTINCT FROM 'skipped' OR NEW.skip_reason IS DISTINCT FROM 'notifications_disabled' THEN
      RAISE EXCEPTION 'school gate: this notification switch is off';
    END IF;
    NEW.recipient_email := NULL;
    NEW.guardian_contact_id := NULL;
    NEW.staff_email_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.status = 'skipped' THEN
    IF NEW.skip_reason IS DISTINCT FROM 'no_verified_recipient'
       AND NEW.skip_reason IS DISTINCT FROM 'no_consent'
       AND NEW.skip_reason IS DISTINCT FROM 'invalid_recipient' THEN
      RAISE EXCEPTION 'school gate: skip_reason does not match an enabled notification switch';
    END IF;
    NEW.recipient_email := NULL;
    NEW.guardian_contact_id := NULL;
    NEW.staff_email_id := NULL;
    RETURN NEW;
  END IF;

  IF v_session.subject_type = 'student' THEN
    IF NEW.guardian_contact_id IS NULL OR NEW.staff_email_id IS NOT NULL THEN
      RAISE EXCEPTION 'school gate: a student notification uses a guardian contact';
    END IF;
    SELECT * INTO v_guardian
    FROM public.school_entry_exit_guardian_contacts
    WHERE id = NEW.guardian_contact_id;
    IF NOT FOUND
       OR v_guardian.tenant_id IS DISTINCT FROM NEW.tenant_id
       OR v_guardian.student_id IS DISTINCT FROM v_session.student_id
       OR v_guardian.revoked_at IS NOT NULL
       OR v_guardian.consent_entry_exit IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'school gate: guardian contact is not an active consented recipient for this student';
    END IF;
    NEW.recipient_email := v_guardian.email;
    RETURN NEW;
  END IF;

  IF NEW.staff_email_id IS NULL OR NEW.guardian_contact_id IS NOT NULL THEN
    RAISE EXCEPTION 'school gate: a staff notification uses a verified staff email';
  END IF;
  SELECT * INTO v_staff_email
  FROM public.school_staff_email_verifications
  WHERE id = NEW.staff_email_id;
  IF NOT FOUND
     OR v_staff_email.tenant_id IS DISTINCT FROM NEW.tenant_id
     OR v_staff_email.tenant_staff_id IS DISTINCT FROM v_session.staff_id
     OR v_staff_email.revoked_at IS NOT NULL
     OR v_staff_email.accepts_entry_exit_email IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'school gate: staff email is not an active accepted recipient for this staff member';
  END IF;
  NEW.recipient_email := v_staff_email.email;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_school_entry_exit_notification_guard ON public.school_entry_exit_notifications;
CREATE TRIGGER trg_school_entry_exit_notification_guard
  BEFORE INSERT OR UPDATE ON public.school_entry_exit_notifications
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_notification_guard();

DROP TRIGGER IF EXISTS trg_school_entry_exit_notification_no_delete ON public.school_entry_exit_notifications;
CREATE TRIGGER trg_school_entry_exit_notification_no_delete
  BEFORE DELETE ON public.school_entry_exit_notifications
  FOR EACH ROW EXECUTE FUNCTION public.school_gate_append_only();

DROP TRIGGER IF EXISTS trg_school_entry_exit_notification_no_truncate ON public.school_entry_exit_notifications;
CREATE TRIGGER trg_school_entry_exit_notification_no_truncate
  BEFORE TRUNCATE ON public.school_entry_exit_notifications
  FOR EACH STATEMENT EXECUTE FUNCTION public.school_gate_append_only();

-- ---------------------------------------------------------------------------
-- RLS. service_role bypasses it. The API must still filter by the signed-in tenant.
-- No authenticated or anon policy is created.
-- ---------------------------------------------------------------------------

ALTER TABLE public.school_id_card_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_id_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_entry_exit_guardian_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_staff_email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_entry_exit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_entry_exit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_gate_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_entry_exit_notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.school_id_card_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.school_id_cards FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.school_entry_exit_guardian_contacts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.school_staff_email_verifications FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.school_entry_exit_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.school_entry_exit_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.school_gate_audit_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.school_entry_exit_notifications FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.school_id_card_settings TO service_role;
GRANT ALL ON public.school_id_cards TO service_role;
GRANT ALL ON public.school_entry_exit_guardian_contacts TO service_role;
GRANT ALL ON public.school_staff_email_verifications TO service_role;
GRANT ALL ON public.school_entry_exit_sessions TO service_role;
GRANT ALL ON public.school_entry_exit_events TO service_role;
GRANT ALL ON public.school_gate_audit_events TO service_role;
GRANT ALL ON public.school_entry_exit_notifications TO service_role;

DROP POLICY IF EXISTS school_id_card_settings_service_role_all ON public.school_id_card_settings;
CREATE POLICY school_id_card_settings_service_role_all
  ON public.school_id_card_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS school_id_cards_service_role_all ON public.school_id_cards;
CREATE POLICY school_id_cards_service_role_all
  ON public.school_id_cards FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS school_entry_exit_guardian_contacts_service_role_all ON public.school_entry_exit_guardian_contacts;
CREATE POLICY school_entry_exit_guardian_contacts_service_role_all
  ON public.school_entry_exit_guardian_contacts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS school_staff_email_verifications_service_role_all ON public.school_staff_email_verifications;
CREATE POLICY school_staff_email_verifications_service_role_all
  ON public.school_staff_email_verifications FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS school_entry_exit_sessions_service_role_all ON public.school_entry_exit_sessions;
CREATE POLICY school_entry_exit_sessions_service_role_all
  ON public.school_entry_exit_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS school_entry_exit_events_service_role_all ON public.school_entry_exit_events;
CREATE POLICY school_entry_exit_events_service_role_all
  ON public.school_entry_exit_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS school_gate_audit_events_service_role_all ON public.school_gate_audit_events;
CREATE POLICY school_gate_audit_events_service_role_all
  ON public.school_gate_audit_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS school_entry_exit_notifications_service_role_all ON public.school_entry_exit_notifications;
CREATE POLICY school_entry_exit_notifications_service_role_all
  ON public.school_entry_exit_notifications FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'school_gate\_%' ESCAPE '\'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

COMMIT;
