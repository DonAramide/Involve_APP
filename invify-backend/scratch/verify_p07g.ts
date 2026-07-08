// ─── Phase 4.7 — Merchant Financial Portal Certification ────────────────────
process.env.NODE_ENV = 'test';

import { MerchantFinancialPortal } from '../src/services/operations-center/MerchantFinancialPortal';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

function printSection(title: string) {
  console.log(`\n${'═'.repeat(68)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(68));
}

async function run() {
  printSection('PHASE 4.7 — MERCHANT FINANCIAL PORTAL CERTIFICATION');

  MerchantFinancialPortal.clearState();

  const results: Record<string, string> = {};

  try {
    const merchantId = 'merch-test-88';
    MerchantFinancialPortal.setupMockMerchant(merchantId);

    // 1. merchant_wallet
    printSection('Gate 1: merchant_wallet');
    const snapshot = MerchantFinancialPortal.getSnapshot(merchantId);
    console.log(`  Available Balance: NGN ${snapshot.wallet.availableBalance.toLocaleString()}`);
    console.log(`  Pending Balance: NGN ${snapshot.wallet.pendingBalance.toLocaleString()}`);
    console.log(`  Settlement Balance: NGN ${snapshot.wallet.settlementBalance.toLocaleString()}`);
    console.log(`  Total Revenue: NGN ${snapshot.wallet.totalRevenue.toLocaleString()}`);
    assert(snapshot.wallet.availableBalance === 8500000, 'Available balance mismatch');
    assert(snapshot.wallet.totalRevenue === 15000000, 'Total revenue mismatch');
    console.log('  ✅ merchant_wallet PASS');
    results['merchant_wallet'] = 'PASS';

    // 2. statement
    printSection('Gate 2: statement');
    console.log(`  Invoices Count: ${snapshot.invoices.length}`);
    for (const inv of snapshot.invoices) {
      console.log(`    - [${inv.status}] Invoice: ${inv.invoiceId} amount=${inv.amount} VAT=${inv.vat} Tax=${inv.tax}`);
    }
    const inv1 = snapshot.invoices[0];
    assert(inv1.vat === 37500, 'VAT calculation mismatched');
    assert(inv1.tax === 25000, 'Tax calculation mismatched');
    console.log('  ✅ statement PASS');
    results['statement'] = 'PASS';

    // 3. analytics
    printSection('Gate 3: analytics');
    console.log(`  Projected 30-Day Revenue: NGN ${snapshot.projectedRevenue30Days.toLocaleString()}`);
    assert(snapshot.projectedRevenue30Days === 18750000, 'Revenue projection forecast error');
    console.log('  ✅ analytics PASS');
    results['analytics'] = 'PASS';

    // 4. withdrawal
    printSection('Gate 4: withdrawal');
    const withdrawalAmount = 1000000;
    const initialAvailable = snapshot.wallet.availableBalance;
    const wResult = MerchantFinancialPortal.requestWithdrawal(merchantId, withdrawalAmount);
    console.log(`  Withdrawal request: success=${wResult.success}, fee=${wResult.statementItem?.fee}`);
    assert(wResult.success, 'Withdrawal request failed');
    assert(wResult.statementItem?.fee === 2500, 'Withdrawal fee mismatch');
    
    const updatedSnap = MerchantFinancialPortal.getSnapshot(merchantId);
    console.log(`  Updated Available Balance: NGN ${updatedSnap.wallet.availableBalance.toLocaleString()}`);
    assert(updatedSnap.wallet.availableBalance === initialAvailable - (withdrawalAmount + 2500), 'Deduction mapping error');
    console.log('  ✅ withdrawal PASS');
    results['withdrawal'] = 'PASS';

    // 5. settlement_history
    printSection('Gate 5: settlement_history');
    console.log('  Triggering Exports:');
    const pdf = MerchantFinancialPortal.triggerExport(merchantId, 'PDF');
    const csv = MerchantFinancialPortal.triggerExport(merchantId, 'CSV');
    const excel = MerchantFinancialPortal.triggerExport(merchantId, 'EXCEL');

    console.log(`    - PDF: ${pdf.fileName}`);
    console.log(`    - CSV: ${csv.fileName}`);
    console.log(`    - Excel: ${excel.fileName}`);
    assert(pdf.fileName.endsWith('.pdf'), 'PDF export name format error');
    assert(csv.fileName.endsWith('.csv'), 'CSV export name format error');
    assert(excel.fileName.endsWith('.excel') || excel.fileName.endsWith('.xlsx') || excel.fileName.includes('.excel'), 'Excel export name format error');
    console.log('  ✅ settlement_history PASS');
    results['settlement_history'] = 'PASS';

    printSection('VERIFICATION SUMMARY');
    for (const [gate, status] of Object.entries(results)) {
      console.log(`  ✅ ${gate}: ${status}`);
    }
    console.log('\n⭐⭐ ALL 5 PHASE 4.7 MERCHANT GATES PASSED ⭐⭐');

  } catch (err: any) {
    console.error('\n❌ Certification failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

run().catch(console.error);
