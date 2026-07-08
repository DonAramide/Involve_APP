// ─── Phase 4.5 — Risk & Fraud Operations Center Certification ──────────────
process.env.NODE_ENV = 'test';

import { RiskFraudOperationsCenter, RiskContext } from '../src/services/operations-center/RiskFraudOperationsCenter';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

function printSection(title: string) {
  console.log(`\n${'═'.repeat(68)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(68));
}

async function run() {
  printSection('PHASE 4.5 — RISK & FRAUD OPERATIONS CENTER CERTIFICATION');

  RiskFraudOperationsCenter.clearState();

  const results: Record<string, string> = {};

  try {
    const baselineContext: RiskContext = {
      accountId: 'acc-123',
      merchantId: 'mer-456',
      amount: 50000,
      deviceName: 'Admin iPhone',
      deviceFingerprint: 'dev-fingerprint-001',
      ipAddress: '197.210.64.12',
      country: 'NG',
      velocityWindowCount: 2,
      chargebackCount: 0
    };

    // 1. aml
    printSection('Gate 1: aml');
    RiskFraudOperationsCenter.blockAccount('acc-evil');
    const amlRes = RiskFraudOperationsCenter.evaluateRisk({ ...baselineContext, accountId: 'acc-evil' });
    console.log(`  AML evaluated score: ${amlRes.score} | decision: ${amlRes.decision}`);
    assert(amlRes.decision === 'BLOCK', 'AML blacklisted account not blocked');
    assert(amlRes.violations.some(v => v.includes('blocked')), 'Missing AML violation description message');
    console.log('  ✅ aml PASS');
    results['aml'] = 'PASS';

    // 2. fraud
    printSection('Gate 2: fraud');
    // Simulate high velocity + untrusted device (Account takeover footprint)
    const fraudContext: RiskContext = {
      ...baselineContext,
      deviceFingerprint: 'dev-unknown-attacker',
      velocityWindowCount: 25
    };
    const fraudRes = RiskFraudOperationsCenter.evaluateRisk(fraudContext);
    console.log(`  Takeover evaluated score: ${fraudRes.score} | decision: ${fraudRes.decision}`);
    assert(fraudRes.decision === 'BLOCK', 'Fraud takeover transaction must be blocked');
    assert(fraudRes.violations.length >= 2, 'Must catch device AND velocity violations');
    console.log('  ✅ fraud PASS');
    results['fraud'] = 'PASS';

    // 3. velocity
    printSection('Gate 3: velocity');
    const velocityRes = RiskFraudOperationsCenter.evaluateRisk({ ...baselineContext, velocityWindowCount: 12 });
    console.log(`  Velocity evaluated score: ${velocityRes.score} | decision: ${velocityRes.decision}`);
    assert(velocityRes.decision === 'REVIEW', 'Velocity rate spike should trigger manual review status');
    assert(velocityRes.violations.some(v => v.includes('frequency')), 'Missing velocity violation reason');
    console.log('  ✅ velocity PASS');
    results['velocity'] = 'PASS';

    // 4. device_risk
    printSection('Gate 4: device_risk');
    const untrustedRes = RiskFraudOperationsCenter.evaluateRisk({ ...baselineContext, deviceFingerprint: 'dev-bad-fingerprint' });
    console.log(`  Untrusted device evaluated score: ${untrustedRes.score} | violations: ${untrustedRes.violations.join(', ')}`);
    assert(untrustedRes.violations.some(v => v.includes('hardware')), 'Missing device trust warning trigger');
    console.log('  ✅ device_risk PASS');
    results['device_risk'] = 'PASS';

    // 5. geo_risk
    printSection('Gate 5: geo_risk');
    const geoRes = RiskFraudOperationsCenter.evaluateRisk({ ...baselineContext, country: 'KP' });
    console.log(`  Blacklisted geo evaluated score: ${geoRes.score} | decision: ${geoRes.decision}`);
    assert(geoRes.decision === 'BLOCK', 'Blocked geofenced regions must trigger explicit block');
    assert(geoRes.violations.some(v => v.includes('location')), 'Geo violation description missing');
    console.log('  ✅ geo_risk PASS');
    results['geo_risk'] = 'PASS';

    // 6. merchant_risk
    printSection('Gate 6: merchant_risk');
    RiskFraudOperationsCenter.flagMerchant('mer-scammy', 75, 0.08); // 8% chargebacks (> 5%)
    const merchantRes = RiskFraudOperationsCenter.evaluateRisk({ ...baselineContext, merchantId: 'mer-scammy' });
    console.log(`  Suspicious merchant evaluated score: ${merchantRes.score} | decision: ${merchantRes.decision}`);
    assert(merchantRes.violations.some(v => v.includes('chargeback')), 'High chargeback risk check bypassed');
    console.log('  ✅ merchant_risk PASS');
    results['merchant_risk'] = 'PASS';

    printSection('VERIFICATION SUMMARY');
    for (const [gate, status] of Object.entries(results)) {
      console.log(`  ✅ ${gate}: ${status}`);
    }
    console.log('\n⭐⭐ ALL 6 PHASE 4.5 RFOC GATES PASSED ⭐⭐');

  } catch (err: any) {
    console.error('\n❌ Certification failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

run().catch(console.error);
