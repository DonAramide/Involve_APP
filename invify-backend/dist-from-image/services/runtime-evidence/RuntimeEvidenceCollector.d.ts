import { RuntimeEvidence } from './RuntimeEvidence';
export declare class RuntimeEvidenceCollector {
    private static collectedEvidences;
    static collectAll(gateName: string, correlationId: string): Promise<RuntimeEvidence[]>;
    static getHistory(): RuntimeEvidence[];
    static clearHistory(): void;
}
