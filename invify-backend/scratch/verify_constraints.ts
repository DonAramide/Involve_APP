import { supabaseAdmin } from '../src/db/supabase';

async function verifyConstraints() {
  console.log('Testing constraint removal on commission_events...');
  
  const { data, error } = await supabaseAdmin.from('commission_events').insert({
    event_type: 'CONSTRAINT_TEST',
    amount: 0,
    previous_state: 'PENDING',
    new_state: 'APPROVED',
    // INTENTIONALLY OMITTING: plan_id, release_date, tenant_activation_log_id, agent_id
  }).select().single();

  if (error) {
    console.error('CONSTRAINT TEST FAILED:', error.message);
  } else {
    console.log('CONSTRAINT TEST PASSED! Row inserted with nulls:');
    console.log('agent_id:', data.agent_id);
    console.log('plan_id:', data.plan_id);
    console.log('release_date:', data.release_date);
    console.log('tenant_activation_log_id:', data.tenant_activation_log_id);
    
    // Clean up
    await supabaseAdmin.from('commission_events').delete().eq('id', data.id);
  }
}

verifyConstraints();
