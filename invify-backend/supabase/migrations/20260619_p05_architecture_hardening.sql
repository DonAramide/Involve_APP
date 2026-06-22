-- ====================================================================
-- ARCHITECTURAL HARDENING MIGRATION
-- 1. Immutability Triggers for tenants.tenant_code, tenants.agent_code, and agents.agent_code
-- 2. CHECK Constraints for devices.device_category and devices.device_role
-- ====================================================================

BEGIN;

-- 1. tenants Immutability Trigger (tenant_code & agent_code referral attribution)
CREATE OR REPLACE FUNCTION public.prevent_tenant_codes_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.tenant_code IS DISTINCT FROM NEW.tenant_code THEN
        RAISE EXCEPTION 'tenant_code is immutable and cannot be updated.';
    END IF;
    IF OLD.agent_code IS DISTINCT FROM NEW.agent_code THEN
        RAISE EXCEPTION 'agent_code attribution is immutable and cannot be updated.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_tenant_codes_update ON public.tenants;
CREATE TRIGGER trg_prevent_tenant_codes_update
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_tenant_codes_update();


-- 2. agents Immutability Trigger (agents.agent_code) - Conditional on agents table existence
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name   = 'agents'
    ) THEN
        -- Create the trigger function
        EXECUTE 'CREATE OR REPLACE FUNCTION public.prevent_agent_code_update()
        RETURNS TRIGGER AS $func$
        BEGIN
            IF OLD.agent_code IS DISTINCT FROM NEW.agent_code THEN
                RAISE EXCEPTION ''agent_code is immutable and cannot be updated.'';
            END IF;
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql';

        -- Drop trigger if exists
        EXECUTE 'DROP TRIGGER IF EXISTS trg_prevent_agent_code_update ON public.agents';
        
        -- Create the trigger
        EXECUTE 'CREATE TRIGGER trg_prevent_agent_code_update
            BEFORE UPDATE ON public.agents
            FOR EACH ROW
            EXECUTE FUNCTION public.prevent_agent_code_update()';
    END IF;
END
$$;


-- 3. CHECK Constraints on public.devices
ALTER TABLE public.devices 
  DROP CONSTRAINT IF EXISTS chk_device_category,
  DROP CONSTRAINT IF EXISTS chk_device_role;

ALTER TABLE public.devices
  ADD CONSTRAINT chk_device_category CHECK (device_category IN ('USER_DEVICE', 'COMPANY_DEVICE')),
  ADD CONSTRAINT chk_device_role CHECK (device_role IN ('PHONE', 'TABLET', 'MPOS', 'PRINTER'));

COMMIT;
