-- ==============================================================================
-- ADDITIVE MIGRATION PROPOSAL: HW Facilities Provider Logo & Geolocation Coordinates
-- Target table: public.hw_facilities
--
-- STATUS: PROPOSED ONLY — DO NOT EXECUTE AUTOMATICALLY.
-- Requires governance authorization and manual execution during deployment window.
--
-- Note: Runtime application code already supports reading/writing logo_url,
-- latitude, and longitude using the restrictions JSON envelope fallback,
-- ensuring 100% zero-downtime operation before this migration is executed.
-- ==============================================================================

DO $$
BEGIN
    -- 1. Add logo_url column for accredited provider institution/hospital logo
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'hw_facilities' 
          AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE public.hw_facilities ADD COLUMN logo_url text;
        COMMENT ON COLUMN public.hw_facilities.logo_url IS 'Contabo S3 URL of the accredited facility/hospital logo image (max 3MB, 512x512 standard).';
    END IF;

    -- 2. Add latitude coordinate column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'hw_facilities' 
          AND column_name = 'latitude'
    ) THEN
        ALTER TABLE public.hw_facilities ADD COLUMN latitude numeric(10, 7);
        COMMENT ON COLUMN public.hw_facilities.latitude IS 'Geographic latitude coordinate (-90.0 to 90.0) of the accredited facility.';
    END IF;

    -- 3. Add longitude coordinate column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'hw_facilities' 
          AND column_name = 'longitude'
    ) THEN
        ALTER TABLE public.hw_facilities ADD COLUMN longitude numeric(10, 7);
        COMMENT ON COLUMN public.hw_facilities.longitude IS 'Geographic longitude coordinate (-180.0 to 180.0) of the accredited facility.';
    END IF;
END $$;
