export declare enum BuildVariant {
    LOCAL = "LOCAL",
    STAGING = "STAGING",
    PROD = "PROD"
}
export declare class BuildVariantService {
    private static instance;
    private readonly variant;
    private constructor();
    static getInstance(): BuildVariantService;
    static resetInstance(): void;
    getVariant(): BuildVariant;
    isLocal(): boolean;
    isStaging(): boolean;
    isProd(): boolean;
    isSimulatorAllowed(): boolean;
    getLoggingLevel(): 'debug' | 'info' | 'warn' | 'error';
    getSupabaseConfig(): {
        url: string;
        key: string;
        serviceRoleKey: string;
    };
}
export declare class FeatureGateService {
    static isFeatureEnabled(featureName: string): boolean;
}
