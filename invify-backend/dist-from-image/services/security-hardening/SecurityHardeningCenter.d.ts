import { SecuritySeverity } from './SecurityAuditService';
import { ComplianceSnapshot } from './ComplianceReportService';
export interface SecurityPostureSnapshot {
    /**
     * Composite security score [0–100].
     * Deductions applied for active pentest hooks, open audit events,
     * compliance failures, and bot detections.
     */
    securityScore: number;
    securityStatus: 'SECURE' | 'HARDENING' | 'VULNERABLE';
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
export declare class SecurityHardeningCenter {
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
    static getSecurityPosture(): SecurityPostureSnapshot;
}
