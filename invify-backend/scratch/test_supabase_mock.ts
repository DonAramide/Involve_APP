import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('Testing direct query to pg_catalog/pg_tables...');
  try {
    const { data, error } = await supabaseAdmin
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    console.log('pg_tables result:', { success: !error, data, error });
  } catch (err: any) {
    console.error('pg_tables caught error:', err);
  }
}

run().catch(console.error);
