-- Migration: 20260716000000_p15_enterprise_configuration_service.sql

-- 1. Configuration Providers
CREATE TABLE IF NOT EXISTS public.configuration_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    namespace VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    version VARCHAR(20) DEFAULT '1.0.0',
    supports_secrets BOOLEAN DEFAULT FALSE,
    icon VARCHAR(100),
    documentation_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Configuration Definitions
CREATE TABLE IF NOT EXISTS public.configuration_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.configuration_providers(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value_type VARCHAR(50) NOT NULL, -- string, number, boolean, json
    default_value JSONB,
    description TEXT,
    validation_rule TEXT,
    is_secret_reference BOOLEAN DEFAULT FALSE,
    is_required BOOLEAN DEFAULT FALSE,
    is_editable BOOLEAN DEFAULT TRUE,
    restart_required BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_id, key)
);

-- 3. Configuration Values (Runtime)
CREATE TABLE IF NOT EXISTS public.configuration_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID NOT NULL REFERENCES public.configuration_definitions(id) ON DELETE CASCADE,
    environment VARCHAR(50) NOT NULL DEFAULT 'PRODUCTION',
    tenant_id UUID, -- Null implies Global fallback
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID, -- Can link to auth.users if needed
    UNIQUE(definition_id, environment, tenant_id)
);

-- 4. Configuration History
CREATE TABLE IF NOT EXISTS public.configuration_values_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    value_id UUID NOT NULL REFERENCES public.configuration_values(id) ON DELETE CASCADE,
    environment VARCHAR(50) NOT NULL,
    tenant_id UUID,
    old_value JSONB,
    new_value JSONB,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by UUID
);

-- 5. Trigger for History
CREATE OR REPLACE FUNCTION log_configuration_value_update()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.value IS DISTINCT FROM NEW.value) THEN
        INSERT INTO public.configuration_values_history (
            value_id, environment, tenant_id, old_value, new_value, changed_by
        ) VALUES (
            NEW.id, NEW.environment, NEW.tenant_id, OLD.value, NEW.value, NEW.updated_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_configuration_values_history ON public.configuration_values;
CREATE TRIGGER trigger_configuration_values_history
AFTER UPDATE ON public.configuration_values
FOR EACH ROW
EXECUTE FUNCTION log_configuration_value_update();

-- 6. Initial Seed: QIP Provider
WITH qip_provider AS (
    INSERT INTO public.configuration_providers (namespace, display_name, description, supports_secrets, icon)
    VALUES ('qip', 'Quasar Identity Platform', 'Core platform identity planes', TRUE, 'shield')
    ON CONFLICT (namespace) DO UPDATE SET namespace = EXCLUDED.namespace
    RETURNING id
)
INSERT INTO public.configuration_definitions (provider_id, key, value_type, is_required, is_secret_reference, display_order)
SELECT id, 'qip.quasarIp', 'string', true, false, 1 FROM qip_provider
UNION ALL SELECT id, 'qip.quasarPort', 'number', true, false, 2 FROM qip_provider
UNION ALL SELECT id, 'qip.serviceId', 'string', true, false, 3 FROM qip_provider
UNION ALL SELECT id, 'qip.retailClientId', 'string', true, false, 4 FROM qip_provider
UNION ALL SELECT id, 'qip.schoolClientId', 'string', true, false, 5 FROM qip_provider
UNION ALL SELECT id, 'qip.servicesClientId', 'string', true, false, 6 FROM qip_provider
UNION ALL SELECT id, 'qip.serviceSecret', 'string', false, true, 7 FROM qip_provider
UNION ALL SELECT id, 'qip.retailClientSecret', 'string', false, true, 8 FROM qip_provider
UNION ALL SELECT id, 'qip.schoolClientSecret', 'string', false, true, 9 FROM qip_provider
UNION ALL SELECT id, 'qip.servicesClientSecret', 'string', false, true, 10 FROM qip_provider
ON CONFLICT (provider_id, key) DO NOTHING;

-- 7. Initial Seed: Contabo Provider
WITH contabo_provider AS (
    INSERT INTO public.configuration_providers (namespace, display_name, description, supports_secrets, icon)
    VALUES ('contabo', 'Contabo Object Storage', 'S3-compatible global storage endpoints', TRUE, 'cloud')
    ON CONFLICT (namespace) DO UPDATE SET namespace = EXCLUDED.namespace
    RETURNING id
)
INSERT INTO public.configuration_definitions (provider_id, key, value_type, is_required, is_secret_reference, display_order)
SELECT id, 'contabo.endpoint', 'string', true, false, 1 FROM contabo_provider
UNION ALL SELECT id, 'contabo.region', 'string', true, false, 2 FROM contabo_provider
UNION ALL SELECT id, 'contabo.bucket', 'string', true, false, 3 FROM contabo_provider
UNION ALL SELECT id, 'contabo.accessKey', 'string', true, false, 4 FROM contabo_provider
UNION ALL SELECT id, 'contabo.secretKey', 'string', false, true, 5 FROM contabo_provider
UNION ALL SELECT id, 'contabo.contaboUploadPublicRead', 'boolean', true, false, 6 FROM contabo_provider
UNION ALL SELECT id, 'contabo.objectStorageUploadPublicRead', 'boolean', true, false, 7 FROM contabo_provider
ON CONFLICT (provider_id, key) DO NOTHING;
