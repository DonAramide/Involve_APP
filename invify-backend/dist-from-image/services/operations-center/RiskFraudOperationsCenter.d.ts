export interface RiskContext {
    accountId: string;
    merchantId: string;
    amount: number;
    deviceName: string;
    deviceFingerprint: string;
    ipAddress: string;
    country: string;
    velocityWindowCount: number;
    chargebackCount: number;
}
export interface RfocAlert {
    id: string;
    metric: 'AML' | 'FRAUD' | 'VELOCITY' | 'DEVICE' | 'GEO' | 'MERCHANT';
    severity: 'WARNING' | 'CRITICAL';
    message: string;
    triggeredAt: string;
}
export interface RfocSnapshot {
    globalRiskScore: number;
    blockedAccountsCount: number;
    suspiciousMerchantsCount: number;
    alerts: RfocAlert[];
    capturedAt: string;
}
export declare class RiskFraudOperationsCenter {
    private static blockedAccounts;
    private static suspiciousMerchants;
    private static blacklistedNames;
    private static trustedDevices;
    private static geoBlacklist;
    static clearState(): void;
    static blockAccount(accountId: string): void;
    static flagMerchant(merchantId: string, riskRating: number, chargebackRatio: number): void;
    static evaluateRisk(context: RiskContext): {
        score: number;
        decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
        violations: string[];
        alerts: RfocAlert[];
    };
    static getSnapshot(): RfocSnapshot;
}
