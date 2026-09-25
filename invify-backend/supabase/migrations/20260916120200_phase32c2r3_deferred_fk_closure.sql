/*
=============================================================================
Phase 32C.2R.3 — deferred FK closure after incremental tables exist.

Baseline intentionally omitted FKs whose parents are created later by the 45
migrations (or are OPTIONAL agent tables). This forward migration adds only
FKs where BOTH ends exist and the parent is not an OPTIONAL-only agent object
required for initial launch.

Agent-portal FKs (agents, commission_events, agent_withdrawal_requests) remain
omitted while agent module is OPTIONAL.
=============================================================================
*/

DO $$
BEGIN
  -- fee_transactions.ledger_entry_id -> ledger_entries.id (after p10)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fee_transactions')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ledger_entries')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fee_transactions' AND column_name='ledger_entry_id')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fee_transactions_ledger_entry_id_fkey') THEN
    ALTER TABLE public.fee_transactions
      ADD CONSTRAINT fee_transactions_ledger_entry_id_fkey
      FOREIGN KEY (ledger_entry_id) REFERENCES public.ledger_entries(id);
  END IF;

  -- pos_transaction_attempts.settlement_batch_id -> card_settlement_batches (after card settlement migration)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pos_transaction_attempts')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='card_settlement_batches')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pos_transaction_attempts' AND column_name='settlement_batch_id')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pos_attempts_settlement_batch') THEN
    BEGIN
      ALTER TABLE public.pos_transaction_attempts
        ADD CONSTRAINT fk_pos_attempts_settlement_batch
        FOREIGN KEY (settlement_batch_id) REFERENCES public.card_settlement_batches(id);
    EXCEPTION WHEN others THEN
      -- Column/type mismatch on some environments — non-fatal for empty prod path
      RAISE NOTICE 'skip fk_pos_attempts_settlement_batch: %', SQLERRM;
    END;
  END IF;
END $$;
