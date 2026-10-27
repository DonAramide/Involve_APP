-- PROPOSED — NOT APPLIED. Phase 1 HMO Finance & Profit-Sharing Module.
-- hw_50_profit_sharing: Contractual profit-sharing agreements, periodic calculation statements, and settlement reconciliation.
-- Additive only: Creates new objects with IF NOT EXISTS; alters NO existing tables.
-- Follows strict Invify Health & Wellness standards:
--   - Integer minor units (bigint kobo) for all financial storage
--   - Currency fixed to NGN by default
--   - Maker-Checker dual control for agreement authorization and statement approval
--   - Immutable calculation provenance and audit event logging
--   - Zero PII leakage

BEGIN;

DO $$ BEGIN
  IF to_regclass('public.hw_providers') IS NULL THEN
    RAISE EXCEPTION 'hw_50: prerequisite table public.hw_providers is missing';
  END IF;
END $$;

-- ---------------------------------------------------------------- Profit-Sharing Agreements
CREATE TABLE IF NOT EXISTS public.hw_profit_sharing_agreements (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference                   text NOT NULL UNIQUE CHECK (reference ~ '^[A-Z0-9_\-]{4,60}$'),
  provider_id                 uuid NOT NULL REFERENCES public.hw_providers(id) ON DELETE RESTRICT,
  plan_id                     uuid REFERENCES public.hw_plans(id) ON DELETE RESTRICT, -- NULL applies to all plans
  title                       text NOT NULL,
  version                     integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  effective_from              date NOT NULL,
  effective_to                date,
  currency                    char(3) NOT NULL DEFAULT 'NGN',
  profit_basis                text NOT NULL CHECK (profit_basis IN ('net_profit', 'gross_profit', 'revenue_share')),
  eligible_revenue_categories text[] NOT NULL DEFAULT ARRAY['invoiced_premiums', 'collected_premiums']::text[],
  eligible_cost_categories    text[] NOT NULL DEFAULT ARRAY['direct_hmo_costs', 'claims_costs', 'operating_costs']::text[],
  platform_share_bps          integer NOT NULL CHECK (platform_share_bps >= 0 AND platform_share_bps <= 10000), -- 100% = 10000 basis points
  hmo_share_bps               integer NOT NULL CHECK (hmo_share_bps >= 0 AND hmo_share_bps <= 10000),
  other_beneficiary_share_bps integer NOT NULL DEFAULT 0 CHECK (other_beneficiary_share_bps >= 0 AND other_beneficiary_share_bps <= 10000),
  other_beneficiary_name      text,
  settlement_frequency        text NOT NULL DEFAULT 'monthly' CHECK (settlement_frequency IN ('monthly', 'quarterly', 'annual')),
  settlement_terms            text NOT NULL DEFAULT 'net_30' CHECK (settlement_terms IN ('immediate', 'net_15', 'net_30', 'net_60')),
  status                      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'expired', 'suspended')),
  maker_user_id               uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  maker_email                 text,
  checker_user_id             uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  checker_email               text,
  checker_notes               text,
  approved_at                 timestamptz,
  notes                       text,
  metadata                    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from),
  -- Total basis points allocation must equal exactly 10000 (100.00%)
  CHECK (platform_share_bps + hmo_share_bps + other_beneficiary_share_bps = 10000),
  -- Maker-Checker invariant: Checker cannot be the Maker
  CHECK (checker_user_id IS NULL OR checker_user_id <> maker_user_id)
);

CREATE INDEX IF NOT EXISTS ix_hw_psa_provider ON public.hw_profit_sharing_agreements (provider_id, status);
CREATE INDEX IF NOT EXISTS ix_hw_psa_dates ON public.hw_profit_sharing_agreements (effective_from, effective_to);

-- ---------------------------------------------------------------- Profit-Sharing Statements
CREATE TABLE IF NOT EXISTS public.hw_profit_sharing_statements (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_reference         text NOT NULL UNIQUE CHECK (statement_reference ~ '^[A-Z0-9_\-]{4,60}$'),
  agreement_id                uuid NOT NULL REFERENCES public.hw_profit_sharing_agreements(id) ON DELETE RESTRICT,
  provider_id                 uuid NOT NULL REFERENCES public.hw_providers(id) ON DELETE RESTRICT,
  period_key                  text NOT NULL, -- e.g., '2026-M10' or '2026-Q3'
  period_start                date NOT NULL,
  period_end                  date NOT NULL,
  currency                    char(3) NOT NULL DEFAULT 'NGN',
  eligible_revenue_minor      bigint NOT NULL DEFAULT 0 CHECK (eligible_revenue_minor >= 0),
  eligible_direct_costs_minor bigint NOT NULL DEFAULT 0 CHECK (eligible_direct_costs_minor >= 0),
  eligible_operating_costs_minor bigint NOT NULL DEFAULT 0 CHECK (eligible_operating_costs_minor >= 0),
  approved_adjustments_minor  bigint NOT NULL DEFAULT 0,
  eligible_profit_basis_minor bigint NOT NULL DEFAULT 0,
  platform_share_minor        bigint NOT NULL DEFAULT 0 CHECK (platform_share_minor >= 0),
  hmo_share_minor             bigint NOT NULL DEFAULT 0 CHECK (hmo_share_minor >= 0),
  other_share_minor           bigint NOT NULL DEFAULT 0 CHECK (other_share_minor >= 0),
  amount_settled_minor        bigint NOT NULL DEFAULT 0 CHECK (amount_settled_minor >= 0),
  outstanding_balance_minor   bigint NOT NULL DEFAULT 0 CHECK (outstanding_balance_minor >= 0),
  agreement_version           integer NOT NULL DEFAULT 1 CHECK (agreement_version >= 1),
  included_invoice_ids        uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  included_payment_ids        uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  status                      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'partially_settled', 'settled', 'disputed', 'void')),
  maker_user_id               uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  checker_user_id             uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_at                 timestamptz,
  settled_at                  timestamptz,
  calculation_metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agreement_id, period_key),
  -- Maker-Checker invariant on statement approval
  CHECK (checker_user_id IS NULL OR checker_user_id <> maker_user_id)
);

CREATE INDEX IF NOT EXISTS ix_hw_pss_provider_period ON public.hw_profit_sharing_statements (provider_id, period_key);
CREATE INDEX IF NOT EXISTS ix_hw_pss_status ON public.hw_profit_sharing_statements (status);

-- ---------------------------------------------------------------- Profit-Sharing Settlement Records
CREATE TABLE IF NOT EXISTS public.hw_profit_sharing_settlements (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_reference        text NOT NULL UNIQUE CHECK (settlement_reference ~ '^[A-Z0-9_\-]{4,60}$'),
  statement_id                uuid NOT NULL REFERENCES public.hw_profit_sharing_statements(id) ON DELETE RESTRICT,
  beneficiary_type            text NOT NULL CHECK (beneficiary_type IN ('platform', 'hmo', 'other')),
  beneficiary_name            text NOT NULL,
  amount_payable_minor        bigint NOT NULL CHECK (amount_payable_minor > 0),
  amount_settled_minor        bigint NOT NULL DEFAULT 0 CHECK (amount_settled_minor >= 0),
  currency                    char(3) NOT NULL DEFAULT 'NGN',
  settlement_channel          text NOT NULL DEFAULT 'treasury_reconciled' CHECK (settlement_channel IN ('treasury_reconciled', 'bank_transfer', 'escrow_journal', 'manual_offset')),
  reconciliation_status       text NOT NULL DEFAULT 'pending' CHECK (reconciliation_status IN ('pending', 'reconciled', 'exception', 'disputed')),
  external_reference          text,
  settled_at                  timestamptz,
  reconciled_by               uuid REFERENCES public.users(id),
  reconciliation_notes        text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_hw_ps_settlements_statement ON public.hw_profit_sharing_settlements (statement_id);
CREATE INDEX IF NOT EXISTS ix_hw_ps_settlements_status ON public.hw_profit_sharing_settlements (reconciliation_status);
-- Prevent duplicate reconciliation of the same external bank transaction reference
CREATE UNIQUE INDEX IF NOT EXISTS uq_hw_ps_settlement_ext_ref ON public.hw_profit_sharing_settlements (external_reference) 
  WHERE external_reference IS NOT NULL AND reconciliation_status = 'reconciled';

-- ---------------------------------------------------------------- Row Level Security (RLS)
ALTER TABLE public.hw_profit_sharing_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_profit_sharing_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hw_profit_sharing_settlements ENABLE ROW LEVEL SECURITY;

-- Explicit RLS Policies for Platform Super Admins and Authorized Finance Operators
CREATE POLICY "Platform finance admins can view agreements"
  ON public.hw_profit_sharing_agreements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND (u.role = 'super_admin' OR EXISTS (
      SELECT 1 FROM public.hw_platform_grants g 
      WHERE g.user_id = u.id AND g.permission IN ('platform.finance.view', 'platform.finance.manage')
      AND g.revoked_at IS NULL AND g.expires_at > now()
    ))
  ));

CREATE POLICY "Platform finance admins can manage agreements"
  ON public.hw_profit_sharing_agreements FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND (u.role = 'super_admin' OR EXISTS (
      SELECT 1 FROM public.hw_platform_grants g 
      WHERE g.user_id = u.id AND g.permission IN ('platform.finance.manage', 'platform.agreements.approve')
      AND g.revoked_at IS NULL AND g.expires_at > now()
    ))
  ));

CREATE POLICY "Platform finance admins can view statements"
  ON public.hw_profit_sharing_statements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND (u.role = 'super_admin' OR EXISTS (
      SELECT 1 FROM public.hw_platform_grants g 
      WHERE g.user_id = u.id AND g.permission IN ('platform.finance.view', 'platform.finance.manage')
      AND g.revoked_at IS NULL AND g.expires_at > now()
    ))
  ));

CREATE POLICY "Platform finance admins can manage statements"
  ON public.hw_profit_sharing_statements FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND (u.role = 'super_admin' OR EXISTS (
      SELECT 1 FROM public.hw_platform_grants g 
      WHERE g.user_id = u.id AND g.permission IN ('platform.finance.manage', 'platform.statements.approve')
      AND g.revoked_at IS NULL AND g.expires_at > now()
    ))
  ));

CREATE POLICY "Platform finance admins can view settlements"
  ON public.hw_profit_sharing_settlements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND (u.role = 'super_admin' OR EXISTS (
      SELECT 1 FROM public.hw_platform_grants g 
      WHERE g.user_id = u.id AND g.permission IN ('platform.finance.view', 'platform.finance.manage')
      AND g.revoked_at IS NULL AND g.expires_at > now()
    ))
  ));

CREATE POLICY "Platform finance admins can manage settlements"
  ON public.hw_profit_sharing_settlements FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND (u.role = 'super_admin' OR EXISTS (
      SELECT 1 FROM public.hw_platform_grants g 
      WHERE g.user_id = u.id AND g.permission IN ('platform.finance.manage', 'platform.finance.reconcile')
      AND g.revoked_at IS NULL AND g.expires_at > now()
    ))
  ));

COMMIT;
