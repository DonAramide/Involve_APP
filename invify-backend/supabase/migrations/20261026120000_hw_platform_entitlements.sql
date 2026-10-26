-- PROPOSED — NOT APPLIED.
-- Durable platform entitlement, separate from time-boxed hw_platform_grants.
-- This migration creates the table only. It inserts no entitlement rows and
-- does not alter users or hw_platform_grants.
--
-- Bootstrap and recovery are not performed here. A different active super_admin
-- issues, suspends, or revokes a row through the application. The designated
-- holder cannot do any of those actions. Applying this file grants nothing.
-- Rollback, when separately authorised: DROP TABLE public.hw_platform_entitlements;
-- Do not drop hw_platform_grants or change users.role.

BEGIN;

CREATE TABLE IF NOT EXISTS public.hw_platform_entitlements (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  permission          text NOT NULL CHECK (permission IN (
                        'platform.providers.manage',
                        'platform.plans.manage',
                        'platform.tenants.onboard',
                        'platform.integration.health',
                        'platform.tenant_access'
                      )),
  granted_by          uuid NOT NULL REFERENCES public.users(id),
  granted_at          timestamptz NOT NULL DEFAULT now(),
  reason              text NOT NULL,
  suspended_at        timestamptz,
  suspended_by        uuid REFERENCES public.users(id),
  suspension_reason   text,
  revoked_at          timestamptz,
  revoked_by          uuid REFERENCES public.users(id),
  revocation_reason   text,
  CONSTRAINT hw_platform_entitlements_designated_admin CHECK (
    user_id = 'b8a6b187-9ff2-47dc-bd96-cb846cbd4a7e'::uuid
  ),
  CONSTRAINT hw_platform_entitlements_independent_issuer CHECK (granted_by <> user_id),
  CONSTRAINT hw_platform_entitlements_reason_length CHECK (char_length(btrim(reason)) >= 5),
  CONSTRAINT hw_platform_entitlements_suspension_actor CHECK (
    suspended_at IS NULL OR (suspended_by IS NOT NULL AND char_length(btrim(COALESCE(suspension_reason, ''))) >= 5)
  ),
  CONSTRAINT hw_platform_entitlements_revocation_actor CHECK (
    revoked_at IS NULL OR (revoked_by IS NOT NULL AND char_length(btrim(COALESCE(revocation_reason, ''))) >= 5)
  ),
  CONSTRAINT hw_platform_entitlements_holder_cannot_suspend CHECK (
    suspended_by IS NULL OR suspended_by <> user_id
  ),
  CONSTRAINT hw_platform_entitlements_holder_cannot_revoke CHECK (
    revoked_by IS NULL OR revoked_by <> user_id
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hw_platform_entitlement_open
  ON public.hw_platform_entitlements (user_id, permission)
  WHERE revoked_at IS NULL;

ALTER TABLE public.hw_platform_entitlements ENABLE ROW LEVEL SECURITY;

-- No client policy. Authenticated and anonymous roles cannot read or write.
-- The service role is the only application path.

COMMIT;
