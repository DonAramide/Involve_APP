import { RuntimeEvidence, EvidenceConfidence } from './RuntimeEvidence';

export interface EvidenceProvider {
  name: string;
  source: RuntimeEvidence['source'];
  collect(gate: string, correlationId: string): Promise<RuntimeEvidence>;
  health(): Promise<'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE'>;
  metadata(): Record<string, any>;
  version(): string;
  lastCollection(): string | null;
  confidence(): EvidenceConfidence;
}

export class EvidenceSourceRegistry {
  private static providers: Map<string, EvidenceProvider> = new Map();
  private static collectionsCount = 0;

  static register(provider: EvidenceProvider) {
    this.providers.set(provider.name, provider);
  }

  static getProvider(name: string): EvidenceProvider | undefined {
    return this.providers.get(name);
  }

  static getAllProviders(): EvidenceProvider[] {
    return Array.from(this.providers.values());
  }

  static clearRegistry() {
    this.providers.clear();
    this.collectionsCount = 0;
  }

  static incrementCollections() {
    this.collectionsCount++;
  }

  static getCollectionsCount() {
    return this.collectionsCount;
  }
}
