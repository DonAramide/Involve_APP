import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('Inserting mock row into activations table via admin...');
  try {
    const { data, error } = await supabaseAdmin
      .from('activations')
      .insert({
        id: '00000000-0000-0000-0000-000000000000'
      })
      .select();
    
    if (error) {
      console.error('Error inserting into activations:', error);
    } else {
      console.log('Success! Inserted row data:', data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
