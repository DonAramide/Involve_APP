"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityHardeningCenter = void 0;
const RateLimiter_1 = require("./RateLimiter");
const WAFRulesEngine_1 = require("./WAFRulesEngine");
const IPAllowListService_1 = require("./IPAllowListService");
const GeoBlockingService_1 = require("./GeoBlockingService");
const HSMDesignLayer_1 = require("./HSMDesignLayer");
const PenTestHookService_1 = require("./PenTestHookService");
const SecurityAuditService_1 = require("./SecurityAuditService");
const ComplianceReportService_1 = require("./ComplianceReportService");
class SecurityHardeningCenter {
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
    static getSecurityPosture() {
        const blockedIds = RateLimiter_1.RateLimiter.getBlockedIdentifiers();
        const wafRules = WAFRulesEngine_1.WAFRulesEngine.getRules();
        const ipEntries = IPAllowListService_1.IPAllowListService.getEntries();
        const hsmLog = HSMDesignLayer_1.HSMDesignLayer.getAuditLog();
        const penHooks = PenTestHookService_1.PenTestHookService.getActivations();
        const activeHooks = penHooks.filter((h) => h.active);
        const auditEvents = SecurityAuditService_1.SecurityAuditService.getEvents();
        const severityCounts = SecurityAuditService_1.SecurityAuditService.getSeverityCounts();
        const compliance = ComplianceReportService_1.ComplianceReportService.getComplianceSnapshot();
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
        const securityStatus = score >= 80 ? 'SECURE' : score >= 50 ? 'HARDENING' : 'VULNERABLE';
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
                denyEntries: ipEntries.filter((e) => e.listType === 'DENY').length,
                allowEntries: ipEntries.filter((e) => e.listType === 'ALLOW').length,
            },
            geoBlocking: {
                stance: GeoBlockingService_1.GeoBlockingService.getStance(),
                blockedCountries: GeoBlockingService_1.GeoBlockingService.getBlockedCountries().length,
            },
            hsm: {
                backend: HSMDesignLayer_1.HSMDesignLayer.getBackend(),
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
exports.SecurityHardeningCenter = SecurityHardeningCenter;
//# sourceMappingURL=SecurityHardeningCenter.js.map