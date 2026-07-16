import { supabase } from '../src/db/supabase';

async function verifyDoubleEntry() {
  console.log('[Verification] Starting Double-Entry Verification...');

  // 1. Group by ledger_id and sum credits/debits
  const { data: ledgers, error } = await supabase
    .from('ledgers')
    .select('id, reference, idempotency_key');

  if (error) throw error;

  let allBalanced = true;

  for (const ledger of ledgers) {
    const { data: entries } = await supabase
      .from('ledger_entries')
      .select('amount, type, currency')
      .eq('ledger_id', ledger.id);

    if (!entries || entries.length === 0) continue;

    const currencies = new Set(entries.map(e => e.currency));
    if (currencies.size > 1) {
      console.error(`[Error] Ledger ${ledger.id} has mixed currencies!`);
      allBalanced = false;
    }

    const credits = entries.filter(e => e.type === 'CREDIT').reduce((sum, e) => sum + Number(e.amount), 0);
    const debits = entries.filter(e => e.type === 'DEBIT').reduce((sum, e) => sum + Number(e.amount), 0);

    if (credits !== debits) {
      console.error(`[Error] Ledger ${ledger.id} (Ref: ${ledger.reference}) is unbalanced! Credits: ${credits}, Debits: ${debits}`);
      allBalanced = false;
    }
  }

  if (allBalanced) {
    console.log('[Verification] SUCCESS: All ledgers are perfectly balanced. Double-entry integrity verified.');
  } else {
    console.error('[Verification] FAILED: Imbalances found in double-entry ledgers.');
    process.exit(1);
  }
}

if (require.main === module) {
  verifyDoubleEntry().catch(console.error);
}
