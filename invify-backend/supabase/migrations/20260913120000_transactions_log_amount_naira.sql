-- Keep kobo (0.50) on VA credits. BIGINT truncated 2.50 → 2.
ALTER TABLE public.transactions_log
  ALTER COLUMN amount TYPE NUMERIC(18, 4)
  USING amount::numeric;
