export interface ChaosResult {
    outageResisted: boolean;
    webhookStormThrottled: boolean;
    retryStormCollapsed: boolean;
    dbRestartSurvived: boolean;
    redisRestartSurvived: boolean;
    queueRestartSurvived: boolean;
    networkLatencyTolerated: boolean;
    duplicateCallbacksDropped: boolean;
    doubleWithdrawalBlocked: boolean;
    doubleSettlementBlocked: boolean;
    expiredAuthBlocked: boolean;
    invalidSigBlocked: boolean;
    clockSkewAdjusted: boolean;
    vaultUnavailableSurvived: boolean;
}
export interface EnterpriseCertificationReport {
    reportId: string;
    chaosResult: ChaosResult;
    highVolumeTransactionsCount: number;
    securityRating: 'A+' | 'A' | 'B' | 'F';
    reconciliationMatchRate: number;
    stages: {
        performance: 'PASS' | 'FAIL';
        security: 'PASS' | 'FAIL';
        financialIntegrity: 'PASS' | 'FAIL';
        operationalReadiness: 'PASS' | 'FAIL';
        pilotReady: 'PASS' | 'FAIL';
        goLive: 'PASS' | 'FAIL';
    };
    overallScore: number;
    status: 'PRODUCTION_READY_GO_LIVE' | 'REMEDIATION_REQUIRED';
    certifiedAt: string;
}
export declare class EnterpriseProductionCertifier {
    static runChaosSimulation(): ChaosResult;
    static runCertificationPipeline(): EnterpriseCertificationReport;
}
