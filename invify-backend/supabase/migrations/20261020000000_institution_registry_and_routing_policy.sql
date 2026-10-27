-- ==============================================================================
-- PROPOSED — NOT APPLIED. Phase 1A Additive Architecture Migration.
-- File: 20261020000000_institution_registry_and_routing_policy.sql
-- Description: Multi-Institution Registry, Service Configuration, Multi-Service 
--              Tenant Relationships, Tenant Overrides, and Append-Only Routing Audit.
--
-- Rollback Documentation:
-- To rollback this migration cleanly without affecting existing tenants or ledgers,
-- run the SQL block provided at the end of this file under "ROLLBACK SCRIPT".
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. INSTITUTIONS REGISTRY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institutions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_code     VARCHAR(32) NOT NULL,
    legal_name           VARCHAR(255) NOT NULL,
    trading_name         VARCHAR(255),
    institution_type     VARCHAR(32) NOT NULL,
    status               VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    kyc_status           VARCHAR(32) NOT NULL DEFAULT 'VERIFIED',
    contact_email        VARCHAR(255),
    contact_phone        VARCHAR(32),
    logo_url             TEXT,
    metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ NULL,

    CONSTRAINT ck_institution_type CHECK (
        institution_type IN ('BANK', 'HMO', 'PAYMENT_PROVIDER', 'AGGREGATOR')
    ),
    CONSTRAINT ck_institution_status CHECK (
        status IN ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'RETIRED')
    ),
    CONSTRAINT ck_institution_kyc_status CHECK (
        kyc_status IN ('PENDING', 'VERIFIED', 'REJECTED')
    )
);

-- Case-insensitive uniqueness for active institution codes
CREATE UNIQUE INDEX IF NOT EXISTS uq_institutions_code_active 
ON public.institutions (UPPER(TRIM(institution_code))) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_institutions_type_status 
ON public.institutions (institution_type, status) 
WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------------------
-- 2. INSTITUTION SERVICES & ROUTING POLICY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institution_services (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id          UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    service_type            VARCHAR(32) NOT NULL,
    default_provider        VARCHAR(64) NOT NULL,
    allowed_providers       JSONB NOT NULL DEFAULT '[]'::jsonb,
    tenant_override_policy  VARCHAR(32) NOT NULL DEFAULT 'LOCKED',
    status                  VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    commercial_terms        JSONB NOT NULL DEFAULT '{}'::jsonb,
    policy_version          INT NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_institution_service_pair UNIQUE (institution_id, service_type),
    CONSTRAINT ck_institution_service_type CHECK (
        service_type IN ('PAYMENTS', 'VIRTUAL_ACCOUNTS', 'HEALTH_INSURANCE', 'CARD_ACQUIRING', 'TRANSFERS')
    ),
    CONSTRAINT ck_institution_override_policy CHECK (
        tenant_override_policy IN ('LOCKED', 'PERMITTED_FROM_LIST', 'OPEN')
    ),
    CONSTRAINT ck_institution_service_status CHECK (
        status IN ('ACTIVE', 'DEGRADED', 'MAINTENANCE', 'SUSPENDED')
    )
);

CREATE INDEX IF NOT EXISTS ix_institution_services_lookup 
ON public.institution_services (institution_id, service_type, status);

-- ------------------------------------------------------------------------------
-- 3. TENANT-INSTITUTION RELATIONSHIPS (MULTI-TENANT / MULTI-SERVICE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_institution_relationships (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    institution_id       UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    service_type         VARCHAR(32) NOT NULL,
    status               VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    onboarding_source    VARCHAR(32) NOT NULL DEFAULT 'CODE_INHERITED',
    effective_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at           TIMESTAMPTZ NULL,
    metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_rel_service_type CHECK (
        service_type IN ('PAYMENTS', 'VIRTUAL_ACCOUNTS', 'HEALTH_INSURANCE', 'CARD_ACQUIRING', 'TRANSFERS')
    ),
    CONSTRAINT ck_rel_status CHECK (
        status IN ('ACTIVE', 'SUSPENDED', 'TERMINATED')
    ),
    CONSTRAINT ck_rel_onboarding_source CHECK (
        onboarding_source IN ('CODE_INHERITED', 'ADMIN_ASSIGNED', 'MIGRATED', 'DIRECT')
    )
);

-- Partial unique index: exactly one ACTIVE institution relationship per service type per tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_active_service_relationship 
ON public.tenant_institution_relationships (tenant_id, service_type) 
WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS ix_tenant_inst_rel_tenant_service 
ON public.tenant_institution_relationships (tenant_id, service_type, status);

CREATE INDEX IF NOT EXISTS ix_tenant_inst_rel_institution 
ON public.tenant_institution_relationships (institution_id, service_type, status);

-- ------------------------------------------------------------------------------
-- 4. TENANT SERVICE ROUTING OVERRIDES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_service_routing_overrides (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relationship_id      UUID NOT NULL REFERENCES public.tenant_institution_relationships(id) ON DELETE CASCADE,
    tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    service_type         VARCHAR(32) NOT NULL,
    selected_provider    VARCHAR(64) NOT NULL,
    justification        TEXT,
    approved_by_user_id  UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    is_active            BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_override_service_type CHECK (
        service_type IN ('PAYMENTS', 'VIRTUAL_ACCOUNTS', 'HEALTH_INSURANCE', 'CARD_ACQUIRING', 'TRANSFERS')
    )
);

-- Partial unique index: exactly one ACTIVE override per service type per tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_active_service_override 
ON public.tenant_service_routing_overrides (tenant_id, service_type) 
WHERE is_active = true;

-- ------------------------------------------------------------------------------
-- 5. APPEND-ONLY ROUTING DECISION AUDIT & SHADOW TELEMETRY LOG
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.routing_decision_audit_logs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    service_type         VARCHAR(32) NOT NULL,
    operation_type       VARCHAR(64) NOT NULL,
    resolved_provider    VARCHAR(64) NOT NULL,
    precedence_level     VARCHAR(32) NOT NULL,
    legacy_provider      VARCHAR(64) NULL,
    match_legacy         BOOLEAN NOT NULL DEFAULT true,
    decision_trace_id    VARCHAR(64) NOT NULL,
    context_metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_audit_service_type CHECK (
        service_type IN ('PAYMENTS', 'VIRTUAL_ACCOUNTS', 'HEALTH_INSURANCE', 'CARD_ACQUIRING', 'TRANSFERS')
    ),
    CONSTRAINT ck_precedence_tier CHECK (
        precedence_level IN (
            'CIRCUIT_BREAKER',
            'INSTITUTION_LOCKED',
            'TENANT_OVERRIDE',
            'INSTITUTION_DEFAULT',
            'PLATFORM_FALLBACK'
        )
    )
);

CREATE INDEX IF NOT EXISTS ix_routing_audit_trace 
ON public.routing_decision_audit_logs (decision_trace_id);

CREATE INDEX IF NOT EXISTS ix_routing_audit_tenant_time 
ON public.routing_decision_audit_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_routing_audit_mismatch 
ON public.routing_decision_audit_logs (match_legacy, created_at DESC) 
WHERE NOT match_legacy;

-- Immutable audit log trigger: strictly block mutations and deletions
CREATE OR REPLACE FUNCTION public.inst_block_mutation()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Updates and deletions are strictly prohibited on append-only audit logs (table: %)', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS trg_inst_audit_immutable ON public.routing_decision_audit_logs;
CREATE TRIGGER trg_inst_audit_immutable
BEFORE UPDATE OR DELETE ON public.routing_decision_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.inst_block_mutation();

-- ------------------------------------------------------------------------------
-- 6. ROW-LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_institution_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_service_routing_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_decision_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to extract tenantId from JWT claims
CREATE OR REPLACE FUNCTION public.inst_current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
    SELECT NULLIF(
        COALESCE(
            current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenantId',
            current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id',
            current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId',
            current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id'
        ),
        ''
    )::uuid;
$$;

-- Helper function to check if caller is a platform super-admin
CREATE OR REPLACE FUNCTION public.inst_is_platform_admin() RETURNS boolean
LANGUAGE sql STABLE AS $$
    SELECT COALESCE(
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'platform_admin') OR
        (current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'platform_admin') OR
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin') OR
        (current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'super_admin'),
        false
    );
$$;

-- 6.1 Institutions: Public read for active institutions; Platform Admin for mutations
DROP POLICY IF EXISTS p_institutions_public_read ON public.institutions;
CREATE POLICY p_institutions_public_read ON public.institutions
FOR SELECT USING (status = 'ACTIVE' AND deleted_at IS NULL);

DROP POLICY IF EXISTS p_institutions_admin_all ON public.institutions;
CREATE POLICY p_institutions_admin_all ON public.institutions
FOR ALL USING (public.inst_is_platform_admin());

-- 6.2 Institution Services: Public read for active services; Platform Admin for mutations
DROP POLICY IF EXISTS p_inst_services_public_read ON public.institution_services;
CREATE POLICY p_inst_services_public_read ON public.institution_services
FOR SELECT USING (
    status IN ('ACTIVE', 'DEGRADED', 'MAINTENANCE') AND
    EXISTS (
        SELECT 1 FROM public.institutions i 
        WHERE i.id = institution_services.institution_id 
          AND i.status = 'ACTIVE' 
          AND i.deleted_at IS NULL
    )
);

DROP POLICY IF EXISTS p_inst_services_admin_all ON public.institution_services;
CREATE POLICY p_inst_services_admin_all ON public.institution_services
FOR ALL USING (public.inst_is_platform_admin());

-- 6.3 Tenant Relationships: Tenants read their own; Platform Admins manage all
DROP POLICY IF EXISTS p_tenant_rel_tenant_select ON public.tenant_institution_relationships;
CREATE POLICY p_tenant_rel_tenant_select ON public.tenant_institution_relationships
FOR SELECT USING (tenant_id = public.inst_current_tenant_id());

DROP POLICY IF EXISTS p_tenant_rel_admin_all ON public.tenant_institution_relationships;
CREATE POLICY p_tenant_rel_admin_all ON public.tenant_institution_relationships
FOR ALL USING (public.inst_is_platform_admin());

-- 6.4 Tenant Overrides: Tenants read their own; Platform Admins manage all
DROP POLICY IF EXISTS p_tenant_override_tenant_select ON public.tenant_service_routing_overrides;
CREATE POLICY p_tenant_override_tenant_select ON public.tenant_service_routing_overrides
FOR SELECT USING (tenant_id = public.inst_current_tenant_id());

DROP POLICY IF EXISTS p_tenant_override_admin_all ON public.tenant_service_routing_overrides;
CREATE POLICY p_tenant_override_admin_all ON public.tenant_service_routing_overrides
FOR ALL USING (public.inst_is_platform_admin());

-- 6.5 Audit Logs: Tenants read their own logs; Platform Admins read all; Insert allowed by system
DROP POLICY IF EXISTS p_routing_audit_tenant_select ON public.routing_decision_audit_logs;
CREATE POLICY p_routing_audit_tenant_select ON public.routing_decision_audit_logs
FOR SELECT USING (tenant_id = public.inst_current_tenant_id());

DROP POLICY IF EXISTS p_routing_audit_admin_select ON public.routing_decision_audit_logs;
CREATE POLICY p_routing_audit_admin_select ON public.routing_decision_audit_logs
FOR SELECT USING (public.inst_is_platform_admin());

DROP POLICY IF EXISTS p_routing_audit_insert ON public.routing_decision_audit_logs;
CREATE POLICY p_routing_audit_insert ON public.routing_decision_audit_logs
FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. DEFAULT PLATFORM INSTITUTION SEED DATA
-- ------------------------------------------------------------------------------
-- Seeds the default platform institution 'INVIFY_DEFAULT' (code 'AAA000')
-- Ensures seamless backward compatibility with existing tenants using AAA000.
INSERT INTO public.institutions (
    id,
    institution_code,
    legal_name,
    trading_name,
    institution_type,
    status,
    kyc_status,
    contact_email,
    metadata
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'AAA000',
    'Invify Technologies Platform Default',
    'Invify Default',
    'AGGREGATOR',
    'ACTIVE',
    'VERIFIED',
    'support@invify.org',
    '{"isDefault": true, "systemReserved": true}'::jsonb
) ON CONFLICT DO NOTHING;

-- Seed default routing services for institution code AAA000.
-- AAA000 is an institution identifier and stays uppercase.
-- Provider identifiers are the lowercase tokens Quasar executes:
--   PAYMENTS         paystack, then flutterwave
--   TRANSFERS        nomba, then paystack
--   VIRTUAL_ACCOUNTS connectpoint, then paystack
-- PROVIDUS, WEMA, OPAY, KIMONO, ISO8583, and HMO carriers are not
-- Quasar routing selectors. They are not seeded as routing defaults.
-- CARD_ACQUIRING and HEALTH_INSURANCE remain legal service types for
-- other institution rows; this platform-default routing seed does not
-- assign them a provider. This statement is a proposal and is not applied here.
INSERT INTO public.institution_services (
    institution_id,
    service_type,
    default_provider,
    allowed_providers,
    tenant_override_policy,
    status,
    policy_version
) VALUES
(
    '00000000-0000-0000-0000-000000000000'::uuid,
    'PAYMENTS',
    'paystack',
    '["paystack", "flutterwave"]'::jsonb,
    'PERMITTED_FROM_LIST',
    'ACTIVE',
    1
),
(
    '00000000-0000-0000-0000-000000000000'::uuid,
    'TRANSFERS',
    'nomba',
    '["nomba", "paystack"]'::jsonb,
    'LOCKED',
    'ACTIVE',
    1
),
(
    '00000000-0000-0000-0000-000000000000'::uuid,
    'VIRTUAL_ACCOUNTS',
    'connectpoint',
    '["connectpoint", "paystack"]'::jsonb,
    'LOCKED',
    'ACTIVE',
    1
)
ON CONFLICT DO NOTHING;

COMMIT;

-- ==============================================================================
-- ROLLBACK SCRIPT (Execute only if rolling back this migration)
-- ==============================================================================
/*
BEGIN;
DROP TABLE IF EXISTS public.routing_decision_audit_logs CASCADE;
DROP TABLE IF EXISTS public.tenant_service_routing_overrides CASCADE;
DROP TABLE IF EXISTS public.tenant_institution_relationships CASCADE;
DROP TABLE IF EXISTS public.institution_services CASCADE;
DROP TABLE IF EXISTS public.institutions CASCADE;
DROP FUNCTION IF EXISTS public.inst_block_mutation CASCADE;
DROP FUNCTION IF EXISTS public.inst_current_tenant_id CASCADE;
DROP FUNCTION IF EXISTS public.inst_is_platform_admin CASCADE;
COMMIT;
*/
