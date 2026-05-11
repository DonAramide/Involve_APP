require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const setup = async () => {
  console.log('--- Starting Database Setup ---');
  
  const sql = `
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
