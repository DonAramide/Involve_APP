"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeEvidenceCollector = void 0;
const EvidenceSourceRegistry_1 = require("./EvidenceSourceRegistry");
const EvidenceChainService_1 = require("./EvidenceChainService");
class RuntimeEvidenceCollector {
    static collectedEvidences = [];
    static async collectAll(gateName, correlationId) {
        const providers = EvidenceSourceRegistry_1.EvidenceSourceRegistry.getAllProviders();
        const batch = [];
        for (const provider of providers) {
            EvidenceSourceRegistry_1.EvidenceSourceRegistry.incrementCollections();
            try {
                const start = process.hrtime.bigint();
                const evidence = await provider.collect(gateName, correlationId);
                const end = process.hrtime.bigint();
                let diffMs = Number(end - start) / 1_000_000;
                if (diffMs <= 0) {
                    diffMs = 0.001;
                }
                evidence.durationMs = diffMs;
                const chained = EvidenceChainService_1.EvidenceChainService.linkAndHash(evidence);
                this.collectedEvidences.push(chained);
                batch.push(chained);
            }
            catch (err) {
                // Fallback for unavailable collectors
                const startedAt = new Date().toISOString();
                const failEvidence = {
                    evidenceId: `EVID-FAIL-${Date.now()}`,
                    gate: gateName,
                    collector: provider.name,
                    source: provider.source,
                    collectedAt: startedAt,
                    durationMs: 0.1,
                    confidence: 'UNKNOWN',
                    status: 'UNAVAILABLE',
                    rawData: {},
                    normalizedData: {},
                    validationResult: false,
                    errors: [err.message],
                    warnings: [],
                    correlationId
                };
                const chained = EvidenceChainService_1.EvidenceChainService.linkAndHash(failEvidence);
                this.collectedEvidences.push(chained);
                batch.push(chained);
            }
        }
        return batch;
    }
    static getHistory() {
        return this.collectedEvidences;
    }
    static clearHistory() {
        this.collectedEvidences = [];
    }
}
exports.RuntimeEvidenceCollector = RuntimeEvidenceCollector;
//# sourceMappingURL=RuntimeEvidenceCollector.js.map