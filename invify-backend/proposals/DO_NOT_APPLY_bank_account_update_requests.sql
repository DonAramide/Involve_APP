-- DO NOT APPLY without explicit approval.
-- Central bank-account update requests for tenants and institutions.
-- Never overwrites an approved account in place.

BEGIN;

CREATE TABLE IF NOT EXISTS public.bank_account_update_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('TENANT', 'INSTITUTION')),
  entity_id uuid NOT NULL,
  entity_name text NOT NULL,
  requester_user_id uuid NOT NULL,
  requester_email text,
  current_bank_code text,
  current_bank_name text,
  current_account_number text,
  current_account_name text,
  proposed_bank_code text NOT NULL,
  proposed_bank_name text,
  proposed_account_number text NOT NULL,
  proposed_account_name text NOT NULL,
  match_score_bps integer NOT NULL DEFAULT 0,
  matched_tokens jsonb NOT NULL DEFAULT '[]'::jsonb,
  unmatched_tokens jsonb NOT NULL DEFAULT '[]'::jsonb,
  match_decision text NOT NULL,
  review_reason text,
  status text NOT NULL CHECK (status IN (
    'PENDING_REVIEW',
    'PENDING_NAME_VERIFICATION',
    'APPROVED',
    'REJECTED',
    'REQUIRES_MANUAL_REVIEW',
    'SUPERSEDED'
  )),
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  audit jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bank_account_update_requests_entity_idx
  ON public.bank_account_update_requests (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS bank_account_update_requests_status_idx
  ON public.bank_account_update_requests (status, created_at DESC);

ALTER TABLE public.bank_account_update_requests ENABLE ROW LEVEL SECURITY;

COMMIT;
