-- Platform Config saves (including quasar_base_url) were 500ing because
-- trg_audit_system_configurations inserted into commission_events.event_type,
-- which does not exist on the live commission_events table.
-- Keep version history; stop using commission_events for system config audits.

CREATE OR REPLACE FUNCTION trg_audit_system_configurations()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.config_value IS DISTINCT FROM NEW.config_value) OR TG_OP = 'INSERT' THEN
        INSERT INTO public.configuration_versions (config_key, old_value, new_value, changed_by)
        VALUES (
            NEW.config_key,
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.config_value ELSE NULL END,
            NEW.config_value,
            NEW.updated_by
        );
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN undefined_table OR undefined_column THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
