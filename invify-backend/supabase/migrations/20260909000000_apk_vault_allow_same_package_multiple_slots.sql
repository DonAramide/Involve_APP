-- Allow the same Android package in more than one vault slot.
-- "Upload New APK" occupies an empty slot; only an explicit targetSlotId replaces a slot.
DROP INDEX IF EXISTS public.idx_apk_vault_package_name;
