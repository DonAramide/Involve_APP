-- Additive: 12-character Invify ID card identity codes for Code 128 gate scanning.
-- Format: SSSBBBBBBBBB (3-char org prefix + 9-char beneficiary suffix).
-- Does not alter token_sha256 (legacy opaque tokens remain valid).

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS invify_org_prefix CHAR(3);

COMMENT ON COLUMN public.tenants.invify_org_prefix IS
  'Stable 3-char uppercase alphanumeric Invify ID-card organisation prefix.';

ALTER TABLE public.school_id_cards
  ADD COLUMN IF NOT EXISTS invify_code VARCHAR(12);

COMMENT ON COLUMN public.school_id_cards.invify_code IS
  '12-char uppercase Invify identity code printed as Code 128 (org prefix + person suffix).';

CREATE UNIQUE INDEX IF NOT EXISTS school_id_cards_tenant_invify_code_uidx
  ON public.school_id_cards (tenant_id, invify_code)
  WHERE invify_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_invify_org_prefix_uidx
  ON public.tenants (invify_org_prefix)
  WHERE invify_org_prefix IS NOT NULL;
