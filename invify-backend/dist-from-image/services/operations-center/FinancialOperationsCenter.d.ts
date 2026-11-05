export interface FocTransaction {
    id: string;
    type: 'INCOMING' | 'OUTGOING';
    amount: number;
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRYING';
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA';
    reference: string;
    step: 'RECEIVED' | 'VERIFIED' | 'AUTHORIZED' | 'PROVIDER' | 'SETTLEMENT' | 'COMPLETED';
    updatedAt: string;
}
export interface FocMetrics {
    incomingMoneyTotal: number;
    outgoingMoneyTotal: number;
    pendingCount: number;
    failedCount: number;
    retryingCount: number;
}
export interface FocQueueStatus {
    name: string;
    depth: number;
    completed: number;
    failed: number;
}
export interface FocProviderStatus {
    provider: string;
    status: 'HEALTHY' | 'MAINTENANCE' | 'DEGRADED';
    latencyMs: number;
    successRate: number;
}
export interface FocSnapshot {
    metrics: FocMetrics;
    providers: FocProviderStatus[];
    queues: FocQueueStatus[];
    capturedAt: string;
}
export declare class FinancialOperationsCenter {
    private static transactions;
    private static incidents;
    static clearState(): void;
    static trackTransaction(tx: FocTransaction): void;
    static getTransaction(id: string): FocTransaction | null;
    static getSnapshot(): FocSnapshot;
    static getTimeline(transactionId: string): string[];
    static replay(transactionId: string): boolean;
    static retry(transactionId: string): boolean;
    static pause(transactionId: string): boolean;
    static cancel(transactionId: string): boolean;
    static investigate(transactionId: string, issue: string): string;
    static getIncidents(): {
        id: string;
        transactionId: string;
        issue: string;
        status: "OPEN" | "RESOLVED";
    }[];
}
