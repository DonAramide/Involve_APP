import { RuntimeEvidence } from './RuntimeEvidence';
export declare class EvidenceChainService {
    private static lastHash;
    static clearChain(): void;
    static linkAndHash(evidence: RuntimeEvidence): RuntimeEvidence;
    static getLastHash(): string;
    static verifyChain(evidences: RuntimeEvidence[]): boolean;
}
