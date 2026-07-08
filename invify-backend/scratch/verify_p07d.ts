// ─── Phase 4.4 — Enterprise Reconciliation Center Certification ─────────────
process.env.NODE_ENV = 'test';

import { EnterpriseReconciliationCenter, ProviderTxLog, QuasarEventLog, LedgerEntryLog } from '../src/services/operations-center/EnterpriseReconciliationCenter';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

function printSection(title: string) {
  console.log(`\n${'═'.repeat(68)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(68));
}

async function run() {
  printSection('PHASE 4.4 — ENTERPRISE RECONCILIATION CENTER CERTIFICATION');

  EnterpriseReconciliationCenter.clearState();

  const results: Record<string, string> = {};

  try {
    // Setup clean baseline records
    const cleanProvider: ProviderTxLog = {
      txId: 'tx-1',
      amount: 100000,
      currency: 'NGN',
      status: 'SUCCESS',
      providerRef: 'PAYSTACK-001'
    };

    const cleanEvent: QuasarEventLog = {
      eventId: 'evt-1',
      reference: 'REF-001',
      amount: 100000,
      currency: 'NGN',
      state: 'COMPLETED'
    };

    const cleanLedger: LedgerEntryLog = {
      entryId: 'led-1',
      reference: 'REF-001',
      amount: -100000,
      currency: 'NGN'
    };

    // 1. auto_reconciliation
    printSection('Gate 1: auto_reconciliation');
    const cleanResult = await EnterpriseReconciliationCenter.autoReconcile(cleanProvider, cleanEvent, cleanLedger);
    console.log(`  Clean matching status: ${cleanResult}`);
    assert(cleanResult === 'RECONCILED', 'Auto reconciliation baseline failed');
    assert(EnterpriseReconciliationCenter.getReconciliationHistory().length === 1, 'Reconciliation history record failed');
    console.log('  ✅ auto_reconciliation PASS');
    results['auto_reconciliation'] = 'PASS';

    // 2. mismatch_detection
    printSection('Gate 2: mismatch_detection');
    // Amount wrong mismatch
    const wrongAmtProvider: ProviderTxLog = { ...cleanProvider, amount: 95000, providerRef: 'PAYSTACK-002' };
    const mismatch1 = await EnterpriseReconciliationCenter.autoReconcile(wrongAmtProvider, cleanEvent, cleanLedger);
    assert(mismatch1 === 'DISCREPANCY', 'Amount wrong mismatch not detected');

    // Currency mismatch
    const currencyProvider: ProviderTxLog = { ...cleanProvider, currency: 'USD', providerRef: 'PAYSTACK-003' };
    const mismatch2 = await EnterpriseReconciliationCenter.autoReconcile(currencyProvider, cleanEvent, cleanLedger);
    assert(mismatch2 === 'DISCREPANCY', 'Currency mismatch not detected');

    // State mismatch
    const failedEvent: QuasarEventLog = { ...cleanEvent, state: 'FAILED' };
    const mismatch3 = await EnterpriseReconciliationCenter.autoReconcile(cleanProvider, failedEvent, cleanLedger);
    assert(mismatch3 === 'DISCREPANCY', 'State status mismatch not detected');

    console.log(`  Total raised discrepancies: ${EnterpriseReconciliationCenter.getDiscrepancies().length}`);
    assert(EnterpriseReconciliationCenter.getDiscrepancies().length === 3, 'Incorrect mismatch registry total count');
    console.log('  ✅ mismatch_detection PASS');
    results['mismatch_detection'] = 'PASS';

    // 3. manual_reconciliation
    printSection('Gate 3: manual_reconciliation');
    const list = EnterpriseReconciliationCenter.getDiscrepancies();
    const targetDiscId = list[0].id;
    const resolved = EnterpriseReconciliationCenter.reconcileManually(targetDiscId, 'ops-operator-01');
    assert(resolved, 'Manual reconciliation function failed');
    const checkedDisc = EnterpriseReconciliationCenter.getDiscrepancies().find(d => d.id === targetDiscId)!;
    console.log(`  Manual resolving state: ${checkedDisc.status} by ${checkedDisc.resolvedBy}`);
    assert(checkedDisc.status === 'RESOLVED', 'Discrepancy status should transition to RESOLVED');
    assert(checkedDisc.resolvedBy === 'ops-operator-01', 'Discrepancy resolution trace logs operator');
    console.log('  ✅ manual_reconciliation PASS');
    results['manual_reconciliation'] = 'PASS';

    // 4. settlement_validation
    printSection('Gate 4: settlement_validation');
    // Test Missing event (MISSING_SETTLEMENT)
    const missingResult = await EnterpriseReconciliationCenter.autoReconcile(cleanProvider, null, null);
    assert(missingResult === 'DISCREPANCY', 'Missing settlement match error');
    const newDiscs = EnterpriseReconciliationCenter.getDiscrepancies();
    const missingEntry = newDiscs.find(d => d.type === 'MISSING_SETTLEMENT');
    console.log(`  Detected missing settlement entry: ${missingEntry?.description}`);
    assert(missingEntry !== undefined, 'Missing settlement discrepancy type not resolved');
    console.log('  ✅ settlement_validation PASS');
    results['settlement_validation'] = 'PASS';

    // 5. financial_integrity
    printSection('Gate 5: financial_integrity');
    // Test timeout pending flow
    const pendingProvider: ProviderTxLog = { ...cleanProvider, status: 'PENDING', providerRef: 'PAYSTACK-TIMEOUT' };
    const pendingEvent: QuasarEventLog = { ...cleanEvent, state: 'INITIALIZED' };
    const timeoutResult = await EnterpriseReconciliationCenter.autoReconcile(pendingProvider, pendingEvent, cleanLedger);
    assert(timeoutResult === 'DISCREPANCY', 'Timeout pending check failed');
    const finalDiscs = EnterpriseReconciliationCenter.getDiscrepancies();
    const timeoutEntry = finalDiscs.find(d => d.type === 'TIMEOUT');
    console.log(`  Timeout warning detected: ${timeoutEntry?.description}`);
    assert(timeoutEntry !== undefined, 'Timeout discrepancy entry not registered');
    console.log('  ✅ financial_integrity PASS');
    results['financial_integrity'] = 'PASS';

    printSection('VERIFICATION SUMMARY');
    for (const [gate, status] of Object.entries(results)) {
      console.log(`  ✅ ${gate}: ${status}`);
    }
    console.log('\n⭐⭐ ALL 5 PHASE 4.4 RECONCILIATION GATES PASSED ⭐⭐');

  } catch (err: any) {
    console.error('\n❌ Certification failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

run().catch(console.error);
