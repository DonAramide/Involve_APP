// Force test mode
process.env.NODE_ENV = 'test';

import { RateLimiter }           from '../src/services/security-hardening/RateLimiter';
import { WAFRulesEngine }        from '../src/services/security-hardening/WAFRulesEngine';
import { IPAllowListService }    from '../src/services/security-hardening/IPAllowListService';
import { GeoBlockingService }    from '../src/services/security-hardening/GeoBlockingService';
import { BotDetectionService }   from '../src/services/security-hardening/BotDetectionService';
import { HSMDesignLayer }        from '../src/services/security-hardening/HSMDesignLayer';
import { PenTestHookService }    from '../src/services/security-hardening/PenTestHookService';
import { SecurityAuditService }  from '../src/services/security-hardening/SecurityAuditService';
import { ComplianceReportService } from '../src/services/security-hardening/ComplianceReportService';
import { SecurityHardeningCenter } from '../src/services/security-hardening/SecurityHardeningCenter';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

async function run() {
  console.log('=== PHASE 3.8 BANKING SECURITY HARDENING CERTIFICATION (verify_p06h.ts) ===\n');
  const results: Record<string, string> = {};

  // ── Global cleanup ────────────────────────────────────────────────────────
  RateLimiter.clearState();
  IPAllowListService.clearEntries();
  GeoBlockingService.clearState();
  HSMDesignLayer.clearState();
  PenTestHookService.clearState();
  SecurityAuditService.clearEvents();
  WAFRulesEngine.clearCustomRules();

  try {

    // ────────────────────────────────────────────────────────────────────────
    // Gate 1 — rate_limiter
    // ────────────────────────────────────────────────────────────────────────
    console.log('Gate 1: Rate Limiter...');
    RateLimiter.configure('/api/transfer', { windowMs: 60_000, maxRequests: 3 });

    // First 3 requests should pass
    const r1 = RateLimiter.check('192.168.1.10', '/api/transfer');
    const r2 = RateLimiter.check('192.168.1.10', '/api/transfer');
    const r3 = RateLimiter.check('192.168.1.10', '/api/transfer');
    // 4th should be blocked
    const r4 = RateLimiter.check('192.168.1.10', '/api/transfer');

    console.log(`  r1.allowed=${r1.allowed}, r2.allowed=${r2.allowed}, r3.allowed=${r3.allowed}, r4.allowed=${r4.allowed}`);
    console.log(`  r1.remaining=${r1.remaining}, r4.remaining=${r4.remaining}`);
    assert(r1.allowed === true,  'Request 1 must be allowed');
    assert(r2.allowed === true,  'Request 2 must be allowed');
    assert(r3.allowed === true,  'Request 3 must be allowed');
    assert(r4.allowed === false, 'Request 4 must be BLOCKED (exceeds limit of 3)');
    assert(r1.remaining === 2,   'After req 1: remaining must be 2');
    assert(r4.remaining === 0,   'After block: remaining must be 0');
    assert(RateLimiter.isBlocked('192.168.1.10'), 'Identifier must be marked blocked');
    assert(RateLimiter.getBlockedIdentifiers().includes('192.168.1.10'), 'Blocked list must contain identifier');
    console.log('  ✅ rate_limiter PASS');
    results['rate_limiter'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 2 — waf_rules
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 2: WAF Rules Engine...');

    // SQL Injection
    const sqliReq = WAFRulesEngine.inspect({ query: { id: "1' OR 1=1 --" } });
    console.log(`  SQLi: allowed=${sqliReq.allowed}, violations=${sqliReq.violations.map(v=>v.ruleId)}, riskScore=${sqliReq.riskScore}`);
    assert(sqliReq.allowed === false, 'SQLi payload must be blocked');
    assert(sqliReq.violations.some((v) => v.ruleId === 'SQL_INJECTION'), 'SQL_INJECTION violation must be detected');
    assert(sqliReq.riskScore >= 80, 'SQLi risk score must be >= 80');

    // XSS
    const xssReq = WAFRulesEngine.inspect({ body: { comment: '<script>alert(1)</script>' } });
    console.log(`  XSS: allowed=${xssReq.allowed}, riskScore=${xssReq.riskScore}`);
    assert(xssReq.allowed === false, 'XSS payload must be blocked');
    assert(xssReq.violations.some((v) => v.ruleId === 'XSS'), 'XSS violation must be detected');

    // Path traversal
    const pathReq = WAFRulesEngine.inspect({ path: '/api/files/../../etc/passwd' });
    console.log(`  PathTraversal: allowed=${pathReq.allowed}`);
    assert(pathReq.allowed === false, 'Path traversal must be blocked');
    assert(pathReq.violations.some((v) => v.ruleId === 'PATH_TRAVERSAL'), 'PATH_TRAVERSAL must be detected');

    // Clean request
    const cleanReq = WAFRulesEngine.inspect({ query: { amount: '5000' }, body: { ref: 'TXN-001' } });
    console.log(`  Clean: allowed=${cleanReq.allowed}, violations=${cleanReq.violations.length}`);
    assert(cleanReq.allowed === true, 'Clean request must be allowed');
    assert(cleanReq.violations.length === 0, 'Clean request must have 0 violations');

    console.log('  ✅ waf_rules PASS');
    results['waf_rules'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 3 — ip_allow_list
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 3: IP Allow List Service...');
    IPAllowListService.addEntry('10.0.0.0/8',      'ALLOW', null, 'Internal network');
    IPAllowListService.addEntry('185.220.101.5/32', 'DENY',  null, 'Known Tor exit node');
    IPAllowListService.addEntry('192.168.1.0/24',   'ALLOW', 'tenant-A', 'Tenant A office');

    const ipAllow   = IPAllowListService.checkIP('10.0.0.50');
    const ipDeny    = IPAllowListService.checkIP('185.220.101.5');
    const ipTenant  = IPAllowListService.checkIP('192.168.1.100', 'tenant-A');
    const ipDefault = IPAllowListService.checkIP('8.8.8.8'); // no match → default allow

    console.log(`  10.0.0.50 → allowed=${ipAllow.allowed}`);
    console.log(`  185.220.101.5 → allowed=${ipDeny.allowed}`);
    console.log(`  192.168.1.100 (tenant-A) → allowed=${ipTenant.allowed}`);
    console.log(`  8.8.8.8 → allowed=${ipDefault.allowed} (default)`);

    assert(ipAllow.allowed === true,   'Internal IP must be allowed');
    assert(ipDeny.allowed  === false,  'Denied IP must be blocked');
    assert(ipTenant.allowed === true,  'Tenant-scoped IP must be allowed');
    assert(ipDefault.allowed === true, 'Unknown IP defaults to allow');
    console.log('  ✅ ip_allow_list PASS');
    results['ip_allow_list'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 4 — geo_blocking
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 4: Geo Blocking Service...');
    GeoBlockingService.blockCountry('RU');
    GeoBlockingService.blockCountry('KP');
    GeoBlockingService.allowCountry('NG');
    GeoBlockingService.allowCountry('US');
    const bypass = 'OPS-BYPASS-2024';
    GeoBlockingService.registerBypassKey(bypass);

    const geoRu  = GeoBlockingService.checkCountry('RU');
    const geoKP  = GeoBlockingService.checkCountry('KP');
    const geoNG  = GeoBlockingService.checkCountry('NG');
    const geoByp = GeoBlockingService.checkCountry('RU', bypass);

    console.log(`  RU → allowed=${geoRu.allowed}, KP → allowed=${geoKP.allowed}`);
    console.log(`  NG → allowed=${geoNG.allowed}, RU(bypass) → allowed=${geoByp.allowed}`);

    assert(geoRu.allowed  === false, 'Russia must be blocked');
    assert(geoKP.allowed  === false, 'North Korea must be blocked');
    assert(geoNG.allowed  === true,  'Nigeria must be allowed (ALLOW_ALL stance)');
    assert(geoByp.allowed === true,  'Bypass key must override geo block');

    // Test DENY_ALL stance
    GeoBlockingService.setStance('DENY_ALL');
    const geoUnknown = GeoBlockingService.checkCountry('ZW'); // Zimbabwe, not in allow list
    assert(geoUnknown.allowed === false, 'Unknown country must be denied in DENY_ALL stance');
    const geoUS = GeoBlockingService.checkCountry('US'); // in allow list
    assert(geoUS.allowed === true, 'Explicitly allowed country must pass in DENY_ALL stance');
    GeoBlockingService.setStance('ALLOW_ALL'); // restore

    console.log('  ✅ geo_blocking PASS');
    results['geo_blocking'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 5 — bot_detection
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 5: Bot Detection Service...');

    const botResult = BotDetectionService.analyzeRequest({
      userAgent: 'python-requests/2.28.1',
      headers: {},  // no Accept-Language, no Accept → adds signals
    });
    const humanResult = BotDetectionService.analyzeRequest({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      headers: { 'accept-language': 'en-US,en;q=0.9', 'accept': 'text/html' },
    });
    const scannerResult = BotDetectionService.analyzeRequest({
      userAgent: 'sqlmap/1.7.8#stable',
    });
    const crawlerResult = BotDetectionService.analyzeRequest({
      userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
    });

    console.log(`  python-requests → score=${botResult.score}, action=${botResult.action}, classification=${botResult.classification}`);
    console.log(`  Mozilla (human) → score=${humanResult.score}, action=${humanResult.action}`);
    console.log(`  sqlmap          → score=${scannerResult.score}, action=${scannerResult.action}`);
    console.log(`  Googlebot       → score=${crawlerResult.score}, classification=${crawlerResult.classification}`);

    assert(botResult.score >= 70,          'python-requests score must be >= 70');
    assert(botResult.action === 'BLOCK',   'python-requests must be BLOCKED');
    assert(humanResult.score < 40,         'Human UA score must be < 40');
    assert(humanResult.action === 'ALLOW', 'Human UA must be ALLOWED');
    assert(scannerResult.score === 100,    'sqlmap score must be 100');
    assert(scannerResult.action === 'BLOCK', 'sqlmap must be BLOCKED');
    assert(crawlerResult.classification === 'KNOWN_CRAWLER', 'Googlebot must be KNOWN_CRAWLER');
    assert(crawlerResult.action === 'ALLOW', 'Googlebot must be ALLOWED');

    console.log('  ✅ bot_detection PASS');
    results['bot_detection'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 6 — hsm_design
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 6: HSM Design Layer...');
    HSMDesignLayer.setBackend('SOFTWARE');

    const signResult    = HSMDesignLayer.sign('key-PAYSTACK-v1', 'transfer-payload-001');
    const verifyResult  = HSMDesignLayer.verify('key-PAYSTACK-v1', 'transfer-payload-001', 'mock-sig');
    const wrapResult    = HSMDesignLayer.wrap('kek-master', 'key-PAYSTACK-v1');
    const unwrapResult  = HSMDesignLayer.unwrap('kek-master', 'wrapped-key-blob');
    const genResult     = HSMDesignLayer.generateKey('key-FLUTTERWAVE-v2');

    console.log(`  sign    → success=${signResult.success}, operationId=${signResult.operationId}`);
    console.log(`  verify  → success=${verifyResult.success}`);
    console.log(`  wrap    → success=${wrapResult.success}`);
    console.log(`  unwrap  → success=${unwrapResult.success}`);
    console.log(`  genKey  → success=${genResult.success}`);
    console.log(`  auditLog entries: ${HSMDesignLayer.getAuditLog().length}`);

    assert(signResult.success    === true, 'SIGN must succeed');
    assert(verifyResult.success  === true, 'VERIFY must succeed');
    assert(wrapResult.success    === true, 'WRAP must succeed');
    assert(unwrapResult.success  === true, 'UNWRAP must succeed');
    assert(genResult.success     === true, 'GENERATE_KEY must succeed');
    assert(signResult.operationId.startsWith('HSM-OP-'), 'operationId must have HSM-OP- prefix');
    assert(signResult.output !== null, 'SIGN must return output');
    assert(HSMDesignLayer.getAuditLog().length === 5, 'Audit log must have 5 entries');
    assert(HSMDesignLayer.getAuditLog()[0].operation === 'SIGN', 'First audit entry must be SIGN');

    console.log('  ✅ hsm_design PASS');
    results['hsm_design'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 7 — pentest_hooks
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 7: PenTest Hook Service...');

    const sqliHook  = PenTestHookService.activateHook('SQL_INJECTION_PROBE', 'pentest-team-1');
    const wafHook   = PenTestHookService.activateHook('WAF_BYPASS_PROBE',    'pentest-team-1');
    const authHook  = PenTestHookService.activateHook('AUTH_BYPASS_PROBE',   'pentest-team-2');

    console.log(`  Active hooks: ${PenTestHookService.getActivations().filter(h=>h.active).length}`);
    assert(PenTestHookService.isActive('SQL_INJECTION_PROBE'), 'SQL_INJECTION_PROBE must be active');
    assert(PenTestHookService.isActive('WAF_BYPASS_PROBE'),    'WAF_BYPASS_PROBE must be active');
    assert(PenTestHookService.isActive('AUTH_BYPASS_PROBE'),   'AUTH_BYPASS_PROBE must be active');

    // Audit events should have been recorded
    const hookEvents = SecurityAuditService.getEventsByType('PENTEST_HOOK');
    console.log(`  Audit events for PENTEST_HOOK: ${hookEvents.length}`);
    assert(hookEvents.length >= 3, 'At least 3 PENTEST_HOOK audit events must be recorded');

    // Deactivate all
    const cleared = PenTestHookService.deactivateAll();
    console.log(`  Deactivated ${cleared} hooks`);
    assert(cleared === 3, 'deactivateAll must report 3 cleared hooks');
    assert(!PenTestHookService.isActive('SQL_INJECTION_PROBE'), 'SQL_INJECTION_PROBE must be inactive after deactivateAll');

    console.log('  ✅ pentest_hooks PASS');
    results['pentest_hooks'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 8 — security_audit
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 8: Security Audit Service...');

    // Record events of various types and severities
    SecurityAuditService.record({ eventType: 'RATE_LIMIT_BLOCKED', severity: 'WARNING', description: 'IP 1.2.3.4 rate limited on /api/payout' });
    SecurityAuditService.record({ eventType: 'WAF_BLOCKED', severity: 'CRITICAL', description: 'SQLi attempt blocked' });
    SecurityAuditService.record({ eventType: 'IP_DENIED',   severity: 'HIGH',     description: 'Denied IP 185.220.101.5' });
    SecurityAuditService.record({ eventType: 'GEO_BLOCKED', severity: 'WARNING',  description: 'Blocked country RU' });
    SecurityAuditService.record({ eventType: 'BOT_DETECTED', severity: 'HIGH',    description: 'python-requests bot blocked', metadata: { score: 90 } });
    SecurityAuditService.record({ eventType: 'AUTH_FAILURE', severity: 'CRITICAL', description: 'Failed API key authentication' });

    const allEvents    = SecurityAuditService.getEvents();
    const wafEvents    = SecurityAuditService.getEventsByType('WAF_BLOCKED');
    const critEvents   = SecurityAuditService.getEventsBySeverity('CRITICAL');
    const breakdown    = SecurityAuditService.getBreakdown();
    const severities   = SecurityAuditService.getSeverityCounts();

    console.log(`  totalEvents=${allEvents.length}, WAF_BLOCKED=${wafEvents.length}, CRITICAL=${critEvents.length}`);
    console.log(`  severityCounts: INFO=${severities.INFO}, WARNING=${severities.WARNING}, HIGH=${severities.HIGH}, CRITICAL=${severities.CRITICAL}`);

    // Previous gates also logged events (pentest hooks, WAF, rate limiter) so count ≥ 6
    assert(allEvents.length >= 6,  'Must have recorded at least 6 audit events');
    assert(wafEvents.length >= 1,  'Must have at least 1 WAF_BLOCKED event');
    assert(critEvents.length >= 2, 'Must have at least 2 CRITICAL events');
    assert(typeof breakdown['RATE_LIMIT_BLOCKED'] === 'number', 'Breakdown must include RATE_LIMIT_BLOCKED');
    assert(severities.CRITICAL >= 2, 'severityCounts.CRITICAL must be >= 2');
    assert(severities.HIGH >= 2,     'severityCounts.HIGH must be >= 2');
    console.log('  ✅ security_audit PASS');
    results['security_audit'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 9 — compliance_pci
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 9: PCI-DSS Compliance Report...');
    const pci = ComplianceReportService.generatePCIDSS();
    console.log(`  PCI-DSS score=${pci.score}%, passed=${pci.passed.length}, failed=${pci.failed.length}`);
    console.log(`  Controls: ${pci.passed.map(c=>c.controlId).join(', ')}`);

    assert(pci.framework === 'PCI_DSS', 'Framework must be PCI_DSS');
    assert(pci.score >= 0 && pci.score <= 100, 'Score must be in [0,100]');
    assert(pci.passed.length > 0, 'Must have at least 1 passing control');
    assert(pci.passed.some((c) => c.controlId === 'PCI-REQ-6'), 'PCI-REQ-6 (WAF) must pass');
    assert(pci.passed.some((c) => c.controlId === 'PCI-REQ-10'), 'PCI-REQ-10 (audit) must pass');
    assert(pci.passed.some((c) => c.controlId === 'PCI-REQ-11'), 'PCI-REQ-11 (pentest) must pass');
    assert(typeof pci.capturedAt === 'string', 'capturedAt must be a string timestamp');
    console.log('  ✅ compliance_pci PASS');
    results['compliance_pci'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 10 — compliance_soc2
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 10: SOC2 & Full Compliance Snapshot...');
    const soc2 = ComplianceReportService.generateSOC2();
    const iso  = ComplianceReportService.generateISO27001();
    const snap = ComplianceReportService.getComplianceSnapshot();

    console.log(`  SOC2 score=${soc2.score}%, ISO27001 score=${iso.score}%, overall=${snap.overallComplianceScore}%`);

    assert(soc2.framework  === 'SOC2',    'SOC2 framework must be SOC2');
    assert(iso.framework   === 'ISO27001','ISO framework must be ISO27001');
    assert(soc2.score  >= 0 && soc2.score  <= 100, 'SOC2 score in [0,100]');
    assert(iso.score   >= 0 && iso.score   <= 100, 'ISO score in [0,100]');
    assert(snap.overallComplianceScore >= 0 && snap.overallComplianceScore <= 100, 'Overall compliance score in [0,100]');
    assert(snap.PCI_DSS  !== undefined, 'Snapshot must include PCI_DSS');
    assert(snap.SOC2     !== undefined, 'Snapshot must include SOC2');
    assert(snap.ISO27001 !== undefined, 'Snapshot must include ISO27001');
    console.log('  ✅ compliance_soc2 PASS');
    results['compliance_soc2'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 11 — security_posture (full snapshot)
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 11: Security Hardening Center — Full Posture...');
    const posture = SecurityHardeningCenter.getSecurityPosture();

    console.log(`  securityScore=${posture.securityScore}, securityStatus=${posture.securityStatus}`);
    console.log(`  WAF rules=${posture.waf.rulesLoaded}, blockedIPs=${posture.rateLimiting.blockedIdentifiers}`);
    console.log(`  HSM ops=${posture.hsm.operationsLogged}, auditEvents=${posture.auditTrail.totalEvents}`);
    console.log(`  Compliance overall=${posture.compliance.overallComplianceScore}%`);

    assert(posture.securityScore >= 0 && posture.securityScore <= 100, 'securityScore must be in [0,100]');
    assert(['SECURE', 'HARDENING', 'VULNERABLE'].includes(posture.securityStatus), 'securityStatus must be valid');
    assert(posture.waf.rulesLoaded >= 5, 'WAF must have at least 5 rules loaded');
    assert(posture.rateLimiting.blockedIdentifiers >= 1, 'Must show at least 1 blocked identifier (from Gate 1)');
    assert(posture.hsm.operationsLogged === 5, 'Must show 5 HSM operations');
    assert(posture.ipAllowList.totalEntries >= 3, 'Must show at least 3 IP entries');
    assert(posture.geoBlocking.blockedCountries >= 2, 'Must show at least 2 blocked countries');
    assert(posture.auditTrail.totalEvents >= 6, 'Must show at least 6 audit events');
    assert(posture.penTestHooks.activeHooks === 0, 'All pentest hooks must be deactivated after Gate 7');
    assert(posture.securityScore < 100, 'Score must be below 100 given audit events and blocked IDs');
    assert(typeof posture.compliance.overallComplianceScore === 'number', 'Compliance score must be a number');

    console.log('  ✅ security_posture PASS');
    results['security_posture'] = 'PASS';

    // ── Summary ───────────────────────────────────────────────────────────
    console.log('\n=== VERIFICATION RESULTS ===');
    for (const [gate, status] of Object.entries(results)) {
      console.log(`  ${gate}: ${status}`);
    }

    const passCount = Object.values(results).filter((s) => s === 'PASS').length;
    console.log(`\n⭐ ALL ${passCount} PHASE 3.8 CERTIFICATION GATES PASSED ⭐`);

  } catch (err: any) {
    console.error('\n❌ Certification failed:', err.message);
    process.exit(1);
  }
}

run().catch(console.error);
