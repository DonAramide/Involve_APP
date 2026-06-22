import { supabaseAdmin } from '../src/db/supabase';

async function check() {
  console.log('=== ROW COUNTS FOR PRODUCTION FINANCIAL ASSESSMENT ===');
  
  const tables = [
    'wallets',
    'wallet_ledger',
    'transactions_log',
    'pos_transaction_attempts',
    'subscription_events',
    'commission_events',
    'agent_withdrawal_requests',
    'tenants',
    'users'
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`  - ${table}: Error (${error.message})`);
      } else {
        console.log(`  - ${table}: ${count} rows`);
      }
    } catch (e: any) {
      console.log(`  - ${table}: Exception (${e.message})`);
    }
  }

  // Check if we have any balances to reconstruct
  console.log('\n=== WALLET BALANCES SUMMARY ===');
  try {
    const { data: wallets, error } = await supabaseAdmin.from('wallets').select('tenant_id, balance');
    if (error) {
      console.log('Error fetching wallets:', error.message);
    } else if (wallets) {
      console.log(`Total Wallets: ${wallets.length}`);
      for (const w of wallets) {
        console.log(`  - Tenant: ${w.tenant_id} | Balance: ${w.balance}`);
      }
    }
  } catch (e: any) {
    console.log('Exception fetching wallets:', e.message);
  }

  // Check transaction log summary
  console.log('\n=== TRANSACTION LOGS SUMMARY ===');
  try {
    const { data: logs, error } = await supabaseAdmin.from('transactions_log').select('*');
    if (error) {
       console.log('Error fetching transaction logs:', error.message);
    } else {
       console.log(`Total transactions logs: ${logs?.length || 0}`);
       if (logs && logs.length > 0) {
         console.log('Sample logs:', logs.slice(0, 5));
       }
    }
  } catch (e: any) {
    console.log('Exception fetching transaction logs:', e.message);
  }
}

check().catch(console.error);
