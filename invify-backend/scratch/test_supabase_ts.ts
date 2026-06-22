import { createClient } from '@supabase/supabase-js';

const url = 'https://rpcjelhacmkhzguljdgi.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwY2plbGhhY21raHpndWxqZGdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY2MjU5NiwiZXhwIjoyMDk2MjM4NTk2fQ.GvXBJSiJGdiwLw4BsQjSzVLoDNVJGn526HYiOOErswU';

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  console.log('Testing TS Supabase query via ts-node...');
  const { data, error } = await supabase.from('devices').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Data:', data);
  }
}

run().catch(console.error);
