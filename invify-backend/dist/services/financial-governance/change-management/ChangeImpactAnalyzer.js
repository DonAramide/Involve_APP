"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeImpactAnalyzer = void 0;
/** Adjacency map: which policy types cascade when a given type changes */
const CASCADE_MAP = {
    TREASURY: ['LIQUIDITY', 'SETTLEMENT', 'VERIFICATION', 'ROUTING'],
    LIQUIDITY: ['TREASURY', 'SETTLEMENT'],
    SETTLEMENT: ['ROUTING', 'PROVIDER'],
    ROUTING: ['PROVIDER', 'VERIFICATION'],
    VERIFICATION: ['RISK', 'AML'],
    RISK: ['AML', 'VERIFICATION'],
    AML: ['RISK'],
    WALLET: ['TREASURY', 'VERIFICATION'],
    PROVIDER: ['ROUTING', 'SETTLEMENT'],
    CERTIFICATE: ['PROVIDER', 'SECRET_ROTATION'],
    SECRET_ROTATION: ['CERTIFICATE'],
    FEATURE_FLAG: ['VERIFICATION', 'ROUTING'],
};
const IMPACT_LEVEL_MAP = {
    TREASURY: 'CRITICAL',
    LIQUIDITY: 'HIGH',
    SETTLEMENT: 'HIGH',
    ROUTING: 'HIGH',
    VERIFICATION: 'MEDIUM',
    RISK: 'HIGH',
    AML: 'CRITICAL',
    WALLET: 'HIGH',
    PROVIDER: 'HIGH',
    CERTIFICATE: 'MEDIUM',
    SECRET_ROTATION: 'MEDIUM',
    FEATURE_FLAG: 'LOW',
};
class ChangeImpactAnalyzer {
    static analyze(policyType, proposedData) {
        const cascades = CASCADE_MAP[policyType] ?? [];
        const cascadingDomains = cascades.map((type) => ({
            domain: type,
            affectedCapabilities: this.getCapabilities(type),
            impactLevel: IMPACT_LEVEL_MAP[type],
            reason: `${policyType} policy change propagates to ${type}.`,
        }));
        // Build dependency graph (direct + 1-hop)
        const graph = {};
        graph[policyType] = cascades;
        for (const cascade of cascades) {
            graph[cascade] = CASCADE_MAP[cascade] ?? [];
        }
        const allLevels = [IMPACT_LEVEL_MAP[policyType], ...cascadingDomains.map((d) => d.impactLevel)];
        const overallImpactLevel = allLevels.includes('CRITICAL')
            ? 'CRITICAL' : allLevels.includes('HIGH')
            ? 'HIGH' : allLevels.includes('MEDIUM')
            ? 'MEDIUM' : 'LOW';
        return {
            policyType,
            directDomains: [policyType],
            cascadingDomains,
            overallImpactLevel,
            dependencyGraph: graph,
            rollbackRequired: overallImpactLevel === 'CRITICAL' || overallImpactLevel === 'HIGH',
            estimatedRiskNote: `Changing ${policyType} policy affects ${1 + cascades.length} domain(s). ` +
                `Overall impact: ${overallImpactLevel}. ${cascades.length} cascading domains identified.`,
            analysedAt: new Date().toISOString(),
        };
    }
    static getCapabilities(type) {
        const map = {
            TREASURY: ['treasury.float', 'treasury.limit', 'treasury.reserve', 'treasury.window'],
            LIQUIDITY: ['liquidity.minimum', 'liquidity.reserve', 'liquidity.coverage'],
            SETTLEMENT: ['settlement.window', 'settlement.currency', 'settlement.account', 'settlement.schedule'],
            ROUTING: ['routing.priority', 'routing.failover', 'routing.cost', 'routing.health'],
            VERIFICATION: ['verification.pipeline', 'verification.timeout', 'verification.failfast'],
            RISK: ['risk.threshold', 'risk.manualReview', 'risk.country', 'risk.velocity'],
            AML: ['aml.rules', 'aml.blacklist', 'aml.watchlist', 'aml.threshold'],
            WALLET: ['wallet.currency', 'wallet.balance', 'wallet.status'],
            PROVIDER: ['provider.priority', 'provider.enable', 'provider.disable', 'provider.weight'],
            CERTIFICATE: ['certificate.rotation', 'certificate.expiry', 'certificate.minimumTls'],
            SECRET_ROTATION: ['secret.rotation', 'secret.expiry', 'secret.version'],
            FEATURE_FLAG: ['feature.enable', 'feature.disable', 'feature.rollout'],
        };
        return map[type] ?? [];
    }
}
exports.ChangeImpactAnalyzer = ChangeImpactAnalyzer;
//# sourceMappingURL=ChangeImpactAnalyzer.js.map