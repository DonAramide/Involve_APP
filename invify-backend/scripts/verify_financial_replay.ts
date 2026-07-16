import { supabase } from '../src/db/supabase';

async function verifyFinancialReplay() {
  console.log('[Verification] Starting Full Financial Replay Certification...');

  // 1. Fetch chronological entries
  const { data: entries, error } = await supabase
    .from('ledger_entries')
    .select('tenant_id, account, type, amount')
    .order('created_at', { ascending: true });

  if (error) throw error;

  // 2. Memory Replay Wallet State
  const memoryWallets: Record<string, number> = {};
  
  for (const entry of (entries || [])) {
    if (entry.account === 'USER_WALLET') {
      if (!memoryWallets[entry.tenant_id]) memoryWallets[entry.tenant_id] = 0;
      
      const amt = Number(entry.amount);
      if (entry.type === 'CREDIT') memoryWallets[entry.tenant_id] += amt;
      if (entry.type === 'DEBIT') memoryWallets[entry.tenant_id] -= amt;
      
      // Negative Balance Condition Check during replay
      if (memoryWallets[entry.tenant_id] < 0) {
         console.error(`[CRITICAL] Negative balance detected during replay for tenant ${entry.tenant_id}. Value: ${memoryWallets[entry.tenant_id]}`);
         process.exit(1);
      }
    }
  }

  // 3. Compare Replay with Projections
  let passed = true;
  for (const tenantId of Object.keys(memoryWallets)) {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const dbBalance = wallet ? Number(wallet.balance) : 0;
    
    if (memoryWallets[tenantId] !== dbBalance) {
       console.error(`[Error] Replay drift for ${tenantId}. Replay: ${memoryWallets[tenantId]}, DB: ${dbBalance}`);
       passed = false;
    }
  }

  if (passed) {
    console.log('[Verification] SUCCESS: Financial Replay exactly matches DB projections with zero negative states.');
  } else {
    console.error('[Verification] FAILED: Replay drift.');
    process.exit(1);
  }
}

if (require.main === module) {
  verifyFinancialReplay().catch(console.error);
}
