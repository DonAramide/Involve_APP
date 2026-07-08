import { RateLimiter } from './RateLimiter';
import { WAFRulesEngine } from './WAFRulesEngine';
import { IPAllowListService } from './IPAllowListService';
import { GeoBlockingService } from './GeoBlockingService';
import { BotDetectionService } from './BotDetectionService';
import { HSMDesignLayer } from './HSMDesignLayer';
import { PenTestHookService } from './PenTestHookService';
import { SecurityAuditService, SecuritySeverity } from './SecurityAuditService';
import { ComplianceReportService, ComplianceSnapshot } from './ComplianceReportService';

export interface SecurityPostureSnapshot {
  /**
   * Composite security score [0–100].
   * Deductions applied for active pentest hooks, open audit events,
   * compliance failures, and bot detections.
   */
  securityScore: number;
  securityStatus: 'SECURE' | 'HARDENING' | 'VULNERABLE';

  // Module summaries
  rateLimiting: {
    blockedIdentifiers: number;
  };
  waf: {
    rulesLoaded: number;
  };
  ipAllowList: {
    totalEntries: number;
    denyEntries: number;
    allowEntries: number;
  };
  geoBlocking: {
    stance: string;
    blockedCountries: number;
  };
  hsm: {
    backend: string;
    operationsLogged: number;
  };
  penTestHooks: {
    activeHooks: number;
    totalActivations: number;
  };
  auditTrail: {
    totalEvents: number;
    criticalEvents: number;
    highEvents: number;
    severityCounts: Record<SecuritySeverity, number>;
  };
  compliance: ComplianceSnapshot;
  capturedAt: string;
}

export class SecurityHardeningCenter {
  /**
   * Computes a full security posture snapshot.
   *
   * securityScore algorithm (starts at 100):
   *  - −10 per active pentest hook (max −30) — active probes = exposure
   *  - −5  per CRITICAL audit event (max −25)
   *  - −2  per HIGH audit event (max −10)
   *  - −15 if WAF has < 5 rules loaded
   *  - −10 if compliance overallScore < 80
   *  - −5  per blocked identifier (capped at −10, indicates live attacks)
   *  - Floor at 0
   */
  static getSecurityPosture(): SecurityPostureSnapshot {
    const blockedIds     = RateLimiter.getBlockedIdentifiers();
    const wafRules       = WAFRulesEngine.getRules();
    const ipEntries      = IPAllowListService.getEntries();
    const hsmLog         = HSMDesignLayer.getAuditLog();
    const penHooks       = PenTestHookService.getActivations();
    const activeHooks    = penHooks.filter((h) => h.active);
    const auditEvents    = SecurityAuditService.getEvents();
    const severityCounts = SecurityAuditService.getSeverityCounts();
    const compliance     = ComplianceReportService.getComplianceSnapshot();

    // ── Score computation ──────────────────────────────────────────────────
    let score = 100;

    score -= Math.min(activeHooks.length * 10, 30);
    score -= Math.min(severityCounts.CRITICAL * 5, 25);
    score -= Math.min(severityCounts.HIGH * 2, 10);

    if (wafRules.length < 5) {
      score -= 15;
    }
    if (compliance.overallComplianceScore < 80) {
      score -= 10;
    }
    score -= Math.min(blockedIds.length * 5, 10);

    score = Math.max(0, Math.min(100, score));

    const securityStatus: SecurityPostureSnapshot['securityStatus'] =
      score >= 80 ? 'SECURE' : score >= 50 ? 'HARDENING' : 'VULNERABLE';

    return {
      securityScore: score,
      securityStatus,
      rateLimiting: {
        blockedIdentifiers: blockedIds.length,
      },
      waf: {
        rulesLoaded: wafRules.length,
      },
      ipAllowList: {
        totalEntries: ipEntries.length,
        denyEntries:  ipEntries.filter((e) => e.listType === 'DENY').length,
        allowEntries: ipEntries.filter((e) => e.listType === 'ALLOW').length,
      },
      geoBlocking: {
        stance: GeoBlockingService.getStance(),
        blockedCountries: GeoBlockingService.getBlockedCountries().length,
      },
      hsm: {
        backend: HSMDesignLayer.getBackend(),
        operationsLogged: hsmLog.length,
      },
      penTestHooks: {
        activeHooks: activeHooks.length,
        totalActivations: penHooks.length,
      },
      auditTrail: {
        totalEvents: auditEvents.length,
        criticalEvents: severityCounts.CRITICAL,
        highEvents: severityCounts.HIGH,
        severityCounts,
      },
      compliance,
      capturedAt: new Date().toISOString(),
    };
  }
}
