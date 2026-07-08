import { RuntimeEvidence, EvidenceConfidence } from './RuntimeEvidence';
import { EvidenceSourceRegistry, EvidenceProvider } from './EvidenceSourceRegistry';
import { EvidenceChainService } from './EvidenceChainService';
import { RuntimeTimingProfiler } from './RuntimeTimingProfiler';

export class RuntimeEvidenceCollector {
  private static collectedEvidences: RuntimeEvidence[] = [];

  static async collectAll(gateName: string, correlationId: string): Promise<RuntimeEvidence[]> {
    const providers = EvidenceSourceRegistry.getAllProviders();
    const batch: RuntimeEvidence[] = [];

    for (const provider of providers) {
      EvidenceSourceRegistry.incrementCollections();
      try {
        const start = process.hrtime.bigint();
        const evidence = await provider.collect(gateName, correlationId);
        const end = process.hrtime.bigint();
        
        let diffMs = Number(end - start) / 1_000_000;
        if (diffMs <= 0) {
          diffMs = 0.001;
        }
        evidence.durationMs = diffMs;
        
        const chained = EvidenceChainService.linkAndHash(evidence);
        this.collectedEvidences.push(chained);
        batch.push(chained);
      } catch (err: any) {
        // Fallback for unavailable collectors
        const startedAt = new Date().toISOString();
        const failEvidence: RuntimeEvidence = {
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
        const chained = EvidenceChainService.linkAndHash(failEvidence);
        this.collectedEvidences.push(chained);
        batch.push(chained);
      }
    }

    return batch;
  }

  static getHistory(): RuntimeEvidence[] {
    return this.collectedEvidences;
  }

  static clearHistory() {
    this.collectedEvidences = [];
  }
}
