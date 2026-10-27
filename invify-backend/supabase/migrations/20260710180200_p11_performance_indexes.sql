/*
=============================================================================
Migration: p11_performance_indexes (HISTORICAL)

Phase 32C.2R.3 NOTE:
  This migration version is already recorded in staging
  supabase_migrations.schema_migrations (20260710180200).

  The original body used CREATE INDEX CONCURRENTLY inside a transaction and
  targeted tables/columns that do not exist at this point in the chain
  (and some incorrect column names).

  For greenfield production applies, this file is intentionally a NO-OP.
  Corrected indexes are created by:

    20260916120000_phase32c2r3_p11_index_remediation.sql

  Do not reintroduce CONCURRENTLY inside a transaction here.
=============================================================================
*/

DO $$
BEGIN
  RAISE NOTICE 'p11 historical no-op: indexes deferred to 20260916120000_phase32c2r3_p11_index_remediation';
END $$;
