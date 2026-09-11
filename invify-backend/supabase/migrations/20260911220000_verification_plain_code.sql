ALTER TABLE public.verification_codes
  ADD COLUMN IF NOT EXISTS plain_code VARCHAR(6);

NOTIFY pgrst, 'reload schema';
