export interface TocProviderExposure {
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA';
    floatBalance: number;
    pendingInboundSettlements: number;
    totalExposure: number;
    exposureLimit: number;
    status: 'SAFE' | 'WARNING' | 'CRITICAL';
}
export interface TocForecast {
    day1ProjectedInflow: number;
    day1ProjectedOutflow: number;
    day2ProjectedInflow: number;
    day2ProjectedOutflow: number;
    day3ProjectedInflow: number;
    day3ProjectedOutflow: number;
    predictedTrend: 'STABLE' | 'GROWING' | 'DEPLETING';
}
export interface TocAlert {
    id: string;
    severity: 'WARNING' | 'CRITICAL';
    metric: string;
    message: string;
    triggeredAt: string;
}
export interface TocDashboardSnapshot {
    platformFloat: number;
    reserveRequirement: number;
    liquidityCoverageRatio: number;
    exposures: TocProviderExposure[];
    forecast: TocForecast;
    alerts: TocAlert[];
    capturedAt: string;
}
export declare class TreasuryOperationsCenter {
    private static platformFloat;
    private static reserveRequirement;
    private static providerFloats;
    private static pendingInboundSettlements;
    static clearState(): void;
    static setPlatformFloat(amount: number): void;
    static setReserveRequirement(amount: number): void;
    static setProviderFloat(provider: string, amount: number): void;
    static setPendingInboundSettlement(provider: string, amount: number): void;
    static getSnapshot(): TocDashboardSnapshot;
}
