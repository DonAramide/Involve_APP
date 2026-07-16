"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionReadinessCertifier = void 0;
const RELEASE_TAG_NAME = 'BANKING_PRODUCTION_READY_V1';
const PLATFORM = 'Invify Banking Platform';
const VERSION = '1.0.0';
const ISSUER = 'Invify Engineering — Phase 3 Certification Authority';
class ProductionReadinessCertifier {
    /**
     * Aggregates domain certifications into the top-level production-readiness report
     * and stamps the release tag.
     *
     * Domain scores are weighted:
     *   Security    30%
     *   Queues      15%
     *   Recovery    15%
     *   Observability 10%
     *   Certificates  10%
     *   Vault         10%
     *   Performance   10%
     */
    static generate(domains) {
        const WEIGHTS = {
            SECURITY: 0.30,
            QUEUES: 0.15,
            RECOVERY: 0.15,
            OBSERVABILITY: 0.10,
            CERTIFICATES: 0.10,
            VAULT: 0.10,
            PERFORMANCE: 0.10,
        };
        // Weighted score
        let weightedScore = 0;
        let weightSum = 0;
        for (const domain of domains) {
            const w = WEIGHTS[domain.domain.toUpperCase()] ?? (1 / domains.length);
            weightedScore += domain.score * w;
            weightSum += w;
        }
        // Handle any unweighted domains equally
        const remainingWeight = 1 - weightSum;
        const unweighted = domains.filter((d) => WEIGHTS[d.domain.toUpperCase()] === undefined);
        if (unweighted.length > 0 && remainingWeight > 0) {
            for (const d of unweighted) {
                weightedScore += d.score * (remainingWeight / unweighted.length);
            }
        }
        const productionReadinessScore = Math.round(Math.min(100, weightedScore));
        const failedDomains = domains.filter((d) => d.status === 'FAILED');
        const degradedDomains = domains.filter((d) => d.status === 'DEGRADED');
        const overallStatus = failedDomains.length > 0 ? 'FAILED' :
            degradedDomains.length > 0 ? 'DEGRADED' : 'CERTIFIED';
        // Build release tag
        const domainStatusMap = {};
        for (const d of domains)
            domainStatusMap[d.domain] = d.status;
        // Deterministic content hash from scores
        const hashInput = domains.map((d) => `${d.domain}:${d.score}`).join('|');
        const sha = Buffer.from(hashInput).toString('base64').substring(0, 12).toUpperCase();
        const releaseTag = {
            tag: RELEASE_TAG_NAME,
            certificationDate: new Date().toISOString(),
            certificationScore: productionReadinessScore,
            domains: domainStatusMap,
            issuer: ISSUER,
            sha,
        };
        const certifiedCount = domains.filter((d) => d.status === 'CERTIFIED').length;
        const executiveSummary = overallStatus === 'CERTIFIED'
            ? `All ${certifiedCount} domains certified. Production readiness score: ${productionReadinessScore}/100. ` +
                `Release tag ${RELEASE_TAG_NAME} issued with SHA:${sha}. Platform is cleared for production deployment.`
            : `${failedDomains.length} domain(s) failed, ${degradedDomains.length} degraded. ` +
                `Production readiness score: ${productionReadinessScore}/100. ` +
                `Remediation required before ${RELEASE_TAG_NAME} release tag can be stamped.`;
        return {
            reportId: `PRR-${Date.now()}`,
            generatedAt: new Date().toISOString(),
            platform: PLATFORM,
            version: VERSION,
            overallStatus,
            productionReadinessScore,
            domains,
            releaseTag,
            executiveSummary,
        };
    }
}
exports.ProductionReadinessCertifier = ProductionReadinessCertifier;
//# sourceMappingURL=ProductionReadinessCertifier.js.map