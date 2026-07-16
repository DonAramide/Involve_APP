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
export declare class EvidenceSourceRegistry {
    private static providers;
    private static collectionsCount;
    static register(provider: EvidenceProvider): void;
    static getProvider(name: string): EvidenceProvider | undefined;
    static getAllProviders(): EvidenceProvider[];
    static clearRegistry(): void;
    static incrementCollections(): void;
    static getCollectionsCount(): number;
}
