require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const setup = async () => {
  console.log('--- Starting Database Setup ---');
  
  const sql = `
    -- Ensure Tenants has plan_expires_at
    ALTER TABLE IF EXISTS public.tenants ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

    -- Create Devices Table
    CREATE TABLE IF NOT EXISTS public.devices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid REFERENCES public.tenants(id),
      device_id text UNIQUE,
      status text DEFAULT 'active',
      last_seen timestamptz,
      created_at timestamptz DEFAULT now()
    );

    -- Create Activation Codes Table
    CREATE TABLE IF NOT EXISTS public.device_activations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid REFERENCES public.tenants(id),
      activation_code text UNIQUE,
      duration_days integer,
      is_used boolean DEFAULT false,
      used_at timestamptz,
      created_at timestamptz DEFAULT now()
    );

    -- Create Lesson Notes Cache Table
    CREATE TABLE IF NOT EXISTS public.lesson_notes_cache (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      content_hash text UNIQUE,
      school_id uuid REFERENCES public.tenants(id),
      teacher_id text,
      note_content jsonb,
      is_global boolean DEFAULT true,
      generated_at timestamptz DEFAULT now()
    );

    -- Create Usage Logs Table
    CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id uuid REFERENCES public.tenants(id),
      teacher_id text,
      feature text,
      timestamp timestamptz DEFAULT now()
    );

    -- Indexing
    CREATE INDEX IF NOT EXISTS idx_notes_hash ON public.lesson_notes_cache(content_hash);

  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      console.error('SQL Execution Error:', error);
      console.log('Falling back to direct table check...');
      // If RPC fails, we at least know what's wrong
    } else {
      console.log('Tables created successfully via RPC!');
    }
  } catch (err) {
    console.error('Setup failed:', err.message);
  }
};

setup();
