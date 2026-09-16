-- Phase 31B.1 Forward Migration: Deprecate plain_code column
-- Null out any existing plain_code values in verification_codes to eliminate plaintext OTP exposure
DO 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'verification_codes'
      AND column_name = 'plain_code'
  ) THEN
    UPDATE public.verification_codes SET plain_code = NULL WHERE plain_code IS NOT NULL;
    COMMENT ON COLUMN public.verification_codes.plain_code IS 'DEPRECATED: Plaintext OTP storage removed in Phase 31B.1. Column is unused.';
  END IF;
END ;

NOTIFY pgrst, 'reload schema';
