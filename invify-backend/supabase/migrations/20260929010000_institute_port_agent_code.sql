-- Maker-checker Institute port may reassign tenants.agent_code.
-- tenant_code stays immutable. Historical fee assessments stay on their snapshot agent_id.

BEGIN;

DROP FUNCTION IF EXISTS public.set_tenant_institute_agent_code(uuid, text);

CREATE OR REPLACE FUNCTION public.prevent_tenant_codes_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.tenant_code IS DISTINCT FROM NEW.tenant_code THEN
        RAISE EXCEPTION 'tenant_code is immutable and cannot be updated.';
    END IF;
    IF OLD.agent_code IS DISTINCT FROM NEW.agent_code THEN
        IF current_setting('invify.allow_tenant_agent_port', true) IS DISTINCT FROM 'on' THEN
            RAISE EXCEPTION 'agent_code attribution is immutable and cannot be updated.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_tenant_institute_agent_code(
    p_tenant_id uuid,
    p_agent_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM set_config('invify.allow_tenant_agent_port', 'on', true);
    UPDATE public.tenants
    SET
        agent_code = NULLIF(btrim(p_agent_code), ''),
        updated_at = now()
    WHERE id = p_tenant_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tenant not found';
    END IF;
    RETURN jsonb_build_object('ok', true, 'tenant_id', p_tenant_id);
END;
$$;

REVOKE ALL ON FUNCTION public.set_tenant_institute_agent_code(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_tenant_institute_agent_code(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_tenant_institute_agent_code(uuid, text) TO postgres;

COMMIT;
