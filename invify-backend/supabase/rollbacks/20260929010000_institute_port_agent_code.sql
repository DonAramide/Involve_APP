BEGIN;

DROP FUNCTION IF EXISTS public.set_tenant_institute_agent_code(uuid, text);

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

COMMIT;
