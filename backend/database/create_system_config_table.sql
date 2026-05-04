-- backend/database/create_system_config_table.sql

-- 1. Create a table for system configurations (keys not school-specific)
CREATE TABLE IF NOT EXISTS public.system_config (
    config_key TEXT PRIMARY KEY,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- 2. Seed the table with Gemini API Key area
-- User can run this manually:
-- INSERT INTO public.system_config (config_key, config_value, description)
-- VALUES ('gemini_api_key', 'YOUR_KEY_HERE', 'Google AI Studio API Key for Lesson Note Generation');

-- 3. Security (RLS)
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Only service_role (backend) can read/write everything
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_config' 
        AND policyname = 'Service Role Full Access'
    ) THEN
        CREATE POLICY "Service Role Full Access" ON public.system_config 
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END
$$;

-- 4. Audit Trigger
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_update_config_timestamp ON public.system_config;
CREATE TRIGGER tr_update_config_timestamp
    BEFORE UPDATE ON public.system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();
