import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

async function checkAgents() {
  const { data, error } = await supabaseAdmin.from('agents').select('*').limit(5);
  console.log('Existing Agents:', data);
  console.log('Error:', error);
}

checkAgents();
