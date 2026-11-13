export declare const APPLY_CONFIRM_PHRASE = "APPLY PRODUCTION ENV";
export type EnvRow = {
    key: string;
    valuePreview: string;
    classified: 'flag' | 'secret' | 'plain';
    writable: boolean;
};
export type PendingChange = {
    id: string;
    key: string;
    fromPreview: string;
    toPreview: string;
    proposedValue: string;
    reason: string;
    makerEmail: string;
    makerId: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    decidedAt?: string;
    checkerEmail?: string;
};
export declare function normalizeEmail(value: unknown): string;
export declare function listGovernorEmails(): string[];
export declare function isProductionEnvGovernor(email: unknown, role: unknown): boolean;
export declare function isWritableKey(key: string): boolean;
export declare function classifyKey(key: string): 'flag' | 'secret' | 'plain';
export declare function maskValue(key: string, value: string): string;
export declare class ProductionEnvGovernanceService {
    snapshot(): {
        filePath: string;
        fileExists: boolean;
        rows: EnvRow[];
        pending: PendingChange[];
        governors: string[];
    };
    propose(input: {
        key: string;
        value: string;
        reason: string;
        makerEmail: string;
        makerId: string;
    }): PendingChange;
    reject(id: string, checkerEmail: string, reason: string): PendingChange;
    approve(id: string, checkerEmail: string, confirmPhrase: string): PendingChange;
    private applyKey;
}
export declare const productionEnvGovernance: ProductionEnvGovernanceService;
