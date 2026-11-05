-- Disposable stub parents for parsing DO_NOT_APPLY_hw_invify_catalogue.sql.
-- Not a production migration.

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.hw_providers (
  id uuid PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.hw_plans (
  id uuid PRIMARY KEY,
  provider_id uuid REFERENCES public.hw_providers(id)
);

CREATE TABLE IF NOT EXISTS public.hw_plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.hw_plans(id)
);

CREATE TABLE IF NOT EXISTS public.hw_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.hw_providers(id),
  is_active boolean NOT NULL DEFAULT true
);

DO $$
BEGIN
  BEGIN
    CREATE ROLE anon NOLOGIN;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE ROLE authenticated NOLOGIN;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

CREATE OR REPLACE FUNCTION public.hw_set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
