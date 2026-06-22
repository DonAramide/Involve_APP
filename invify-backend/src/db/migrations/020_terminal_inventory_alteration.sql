-- Alter terminal_inventory to support printer configuration and merchant metadata
ALTER TABLE public.terminal_inventory 
  ADD COLUMN IF NOT EXISTS printer_mac_address VARCHAR(50),
  ADD COLUMN IF NOT EXISTS printer_model       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS merchant_id         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_name           VARCHAR(100);
