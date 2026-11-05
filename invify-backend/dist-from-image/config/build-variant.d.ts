/**
 * Explicit environment / build-variant resolution.
 *
 * Safety rules (Phase 3):
 * - NODE_ENV=production OR APP_ENV=production requires BUILD_VARIANT=PROD (or APP_ENV=production with BUILD_VARIANT=PROD).
 * - Missing BUILD_VARIANT never silently becomes LOCAL when the process claims production.
 * - Staging must be explicit BUILD_VARIANT=STAGING (or APP_ENV=staging).
 */
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
    getAgentPortalUrl(): string;
    /**
     * Canonical web portal origin for login / welcome / profile emails.
     * Single source of truth — production must never silently fall back to staging.
     */
    getAppPortalBaseUrl(): string;
    /**
     * Full login URL for admin, tenant, or Institute (agent) portals.
     */
    getLoginUrl(portal?: 'admin' | 'tenant' | 'agent'): string;
    private assertPortalUrlSafe;
    /**
     * Environment-scoped Supabase configuration.
     * Staging/Production never fall back to hardcoded project URLs or dummy keys.
     */
    getSupabaseConfig(): {
        url: string;
        key: string;
        serviceRoleKey: string;
    };
    private assertNoDevEndpoint;
}
export declare class FeatureGateService {
    static isFeatureEnabled(featureName: string): boolean;
}
