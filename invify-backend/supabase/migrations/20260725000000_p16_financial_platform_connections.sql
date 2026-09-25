/*
=============================================================================
p16_financial_platform_connections — HISTORICAL

Phase 32C.2R.3 / 32C.2R.2 scope freeze:
  financial_platform_connections / financial_platform_audit are LEGACY/EXCLUDED.
  Application source of truth is public.quasar_integrations.

This migration is a NO-OP for greenfield production applies so the chain does
not create unused tables or depend on missing helpers (trigger_set_timestamp,
is_admin). Historical filename/version retained for staging compatibility.
=============================================================================
*/

DO $$
BEGIN
  RAISE NOTICE 'p16 no-op: financial_platform_* excluded; use quasar_integrations';
END $$;
