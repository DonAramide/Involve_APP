import { supabase } from '../src/db/supabase';

async function verifyWalletProjection() {
  console.log('[Verification] Starting Wallet Projection Verification...');

  // 1. Fetch all tenants
  const { data: tenants, error: tenantErr } = await supabase
    .from('tenants')
    .select('id');
    
  if (tenantErr) throw tenantErr;

  let allVerified = true;

  for (const tenant of tenants) {
    // Replay Ledger sum for USER_WALLET
    const { data: entries } = await supabase
      .from('ledger_entries')
      .select('amount, type')
      .eq('tenant_id', tenant.id)
      .eq('account', 'USER_WALLET');

    const derivedBalance = (entries || []).reduce((sum, entry) => {
      const amt = Number(entry.amount);
      if (entry.type === 'CREDIT') return sum + amt;
      if (entry.type === 'DEBIT') return sum - amt;
      return sum;
    }, 0);

    // Get Wallet Projection
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('tenant_id', tenant.id)
      .maybeSingle();

    const projectedBalance = wallet ? Number(wallet.balance) : 0;

    if (derivedBalance !== projectedBalance) {
      console.error(`[Error] Projection mismatch for Tenant ${tenant.id}. Ledger Replay: ${derivedBalance}, Wallet Projection: ${projectedBalance}`);
      allVerified = false;
    }
  }

  if (allVerified) {
    console.log('[Verification] SUCCESS: All wallet projections match exact ledger replays.');
  } else {
    console.error('[Verification] FAILED: Wallet projection drift detected.');
    process.exit(1);
  }
}

if (require.main === module) {
  verifyWalletProjection().catch(console.error);
}
