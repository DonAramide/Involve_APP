// ─── Phase 4.3 — Treasury Operations Center Certification ──────────────────
process.env.NODE_ENV = 'test';

import { TreasuryOperationsCenter } from '../src/services/operations-center/TreasuryOperationsCenter';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

function printSection(title: string) {
  console.log(`\n${'═'.repeat(68)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(68));
}

async function run() {
  printSection('PHASE 4.3 — TREASURY OPERATIONS CENTER CERTIFICATION');

  TreasuryOperationsCenter.clearState();

  const results: Record<string, string> = {};

  try {
    // 1. treasury_dashboard
    printSection('Gate 1: treasury_dashboard');
    const snapshot = TreasuryOperationsCenter.getSnapshot();
    console.log(`  Platform Float: NGN ${snapshot.platformFloat.toLocaleString()}`);
    console.log(`  Reserve Requirement: NGN ${snapshot.reserveRequirement.toLocaleString()}`);
    assert(snapshot.platformFloat === 150_000_000, 'Platform float mapping error');
    assert(snapshot.reserveRequirement === 50_000_000, 'Reserve requirement mapping error');
    console.log('  ✅ treasury_dashboard PASS');
    results['treasury_dashboard'] = 'PASS';

    // 2. liquidity_dashboard
    printSection('Gate 2: liquidity_dashboard');
    console.log(`  Liquidity Coverage Ratio: ${snapshot.liquidityCoverageRatio}`);
    assert(snapshot.liquidityCoverageRatio === 3.0, 'LCR evaluation error');
    console.log('  ✅ liquidity_dashboard PASS');
    results['liquidity_dashboard'] = 'PASS';

    // 3. forecast
    printSection('Gate 3: forecast');
    console.log(`  Predicted Trend: ${snapshot.forecast.predictedTrend}`);
    console.log(`  Day 1 Inflow: NGN ${snapshot.forecast.day1ProjectedInflow.toLocaleString()}`);
    console.log(`  Day 1 Outflow: NGN ${snapshot.forecast.day1ProjectedOutflow.toLocaleString()}`);
    assert(snapshot.forecast.predictedTrend === 'STABLE', 'Forecast trend indicator error');
    assert(snapshot.forecast.day1ProjectedInflow > snapshot.forecast.day1ProjectedOutflow, 'Forecast flows error');
    console.log('  ✅ forecast PASS');
    results['forecast'] = 'PASS';

    // 4. alerting
    printSection('Gate 4: alerting');
    // Drop platform float to trigger a critical LCR alert
    TreasuryOperationsCenter.setPlatformFloat(40_000_000); // LCR = 40M / 50M = 0.8 (< 1.0)
    const alertSnap = TreasuryOperationsCenter.getSnapshot();
    console.log(`  Triggered Alerts Count: ${alertSnap.alerts.length}`);
    for (const alert of alertSnap.alerts) {
      console.log(`    - [${alert.severity}] ${alert.metric}: ${alert.message}`);
    }
    assert(alertSnap.alerts.length >= 1, 'LCR critical threshold alert failed to fire');
    assert(alertSnap.alerts[0].severity === 'CRITICAL', 'LCR alert severity mapping error');
    console.log('  ✅ alerting PASS');
    results['alerting'] = 'PASS';

    // 5. cash_position
    printSection('Gate 5: cash_position');
    // Trigger Wema high exposure warning
    TreasuryOperationsCenter.setProviderFloat('WEMA', 35_000_000);
    TreasuryOperationsCenter.setPendingInboundSettlement('WEMA', 4_000_000); // 35M + 4M = 39M exposure (> 40M * 0.9 = 36M exposure critical)
    
    const cashSnap = TreasuryOperationsCenter.getSnapshot();
    const wemaExp = cashSnap.exposures.find(e => e.provider === 'WEMA');
    console.log(`  Wema Total Exposure: NGN ${wemaExp?.totalExposure.toLocaleString()} | status: ${wemaExp?.status}`);
    assert(wemaExp?.totalExposure === 39_000_000, 'Exposure summation error');
    assert(wemaExp?.status === 'CRITICAL', 'Exposure threshold trigger logic failure');
    console.log('  ✅ cash_position PASS');
    results['cash_position'] = 'PASS';

    printSection('VERIFICATION SUMMARY');
    for (const [gate, status] of Object.entries(results)) {
      console.log(`  ✅ ${gate}: ${status}`);
    }
    console.log('\n⭐⭐ ALL 5 PHASE 4.3 TOC GATES PASSED ⭐⭐');

  } catch (err: any) {
    console.error('\n❌ Certification failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

run().catch(console.error);
