-- ─────────────────────────────────────────────────────────────────────────────
-- P0-5F Migration: lookup_configs table and seed reference data
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lookup_configs (
    id             TEXT        PRIMARY KEY DEFAULT 'global',
    gateways       JSONB       NOT NULL DEFAULT '[]'::jsonb,
    industries     JSONB       NOT NULL DEFAULT '[]'::jsonb,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Enforce single-row singleton pattern
    CONSTRAINT one_row_only CHECK (id = 'global')
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.lookup_configs ENABLE ROW LEVEL SECURITY;

-- 1. SELECT policy: allow anonymous public reads (needed for onboarding registration page)
CREATE POLICY "allow_public_select_lookup_configs" 
  ON public.lookup_configs FOR SELECT 
  USING (true);

-- 2. RESTRICTIVE write policies: block all direct client inserts, updates, and deletes
CREATE POLICY "no_client_insert_lookup_configs" 
  ON public.lookup_configs AS RESTRICTIVE FOR INSERT 
  WITH CHECK (false);

CREATE POLICY "no_client_update_lookup_configs" 
  ON public.lookup_configs AS RESTRICTIVE FOR UPDATE 
  USING (false);

CREATE POLICY "no_client_delete_lookup_configs" 
  ON public.lookup_configs AS RESTRICTIVE FOR DELETE 
  USING (false);

-- Seed initial reference data from lookup_db.json
INSERT INTO public.lookup_configs (id, gateways, industries)
VALUES (
  'global',
  '[
    {"id": "stripe", "label": "Stripe Global", "icon": "credit_card"},
    {"id": "paystack", "label": "Paystack Africa", "icon": "account_balance"},
    {"id": "flutterwave", "label": "Flutterwave Web", "icon": "payments"}
  ]'::jsonb,
  '[
    {"id": "school", "label": "School & Academy", "icon": "school", "desc": "Tuition structures, curriculums, lesson notes database, class logs."},
    {"id": "retail", "label": "Retail & POS Stock", "icon": "shopping_cart", "desc": "Point of sale checkout speeds, inventory, depletion alerts."},
    {"id": "hospitality", "label": "Service Provider", "icon": "dry_cleaning", "desc": "Dry cleaners, tailors, salons, and all professionals rendering specialized services."}
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
