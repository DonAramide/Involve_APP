BEGIN;
DROP TABLE IF EXISTS public.agent_webhook_deliveries;
DROP TABLE IF EXISTS public.agent_webhook_events;
DROP TABLE IF EXISTS public.agent_api_credentials;
DROP TABLE IF EXISTS public.agent_webhook_signing_keys;
DROP TABLE IF EXISTS public.agent_webhook_configs;
COMMIT;
