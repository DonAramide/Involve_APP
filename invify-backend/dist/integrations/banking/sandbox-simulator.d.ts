import { BankingProviderAdapter } from './adapter.interface';
export declare class SandboxProviderAdapter implements BankingProviderAdapter {
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA';
    private static forcedStatus;
    private static latencyOverrides;
    constructor(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA');
    static setForcedStatus(provider: string, status: string): void;
    static setLatencyOverride(provider: string, latencyMs: number): void;
    static clear(): void;
    provisionVirtualAccount(params: any): Promise<any>;
    nameEnquiry(params: any): Promise<any>;
    executeTransfer(params: any): Promise<any>;
    checkTransferStatus(reference: string): Promise<any>;
    validateWebhook(payload: any, signature: string): Promise<boolean>;
    getHealthMetrics(): Promise<any>;
}
