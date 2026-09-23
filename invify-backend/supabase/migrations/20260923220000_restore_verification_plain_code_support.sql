-- Restore support plaintext OTP for Verification Log (super-admin only via API).
-- plain_code is written on send and cleared on VERIFIED / EXPIRED / CANCELLED.
ALTER TABLE public.verification_codes
  ADD COLUMN IF NOT EXISTS plain_code VARCHAR(6);

COMMENT ON COLUMN public.verification_codes.plain_code IS
  'Support-only plaintext OTP for Verification Log. Cleared when status leaves PENDING.';

NOTIFY pgrst, 'reload schema';
