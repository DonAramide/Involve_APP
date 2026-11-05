-- STEP 1 of 2. Run this file alone and wait for it to commit.
-- Do not wrap it in BEGIN/COMMIT. Do not paste the seed in the same batch.
--
-- PostgreSQL error 55P04: a new enum label cannot be referenced until the
-- transaction that added it has committed. That is why seed SQL is a
-- separate file: DO_NOT_APPLY_hmo_service_fee_catalog_seed.sql
--
-- After this succeeds, run the seed file in a new query.
-- Does not change POS, treasury, SMS, or AI rows.
-- Does not enable FEE_ORCHESTRATION_LIVE or wallet posting.

ALTER TYPE public.fee_transaction_type ADD VALUE IF NOT EXISTS 'HMO_SERVICE';
