"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureGateService = exports.BuildVariantService = exports.BuildVariant = void 0;
var BuildVariant;
(function (BuildVariant) {
    BuildVariant["LOCAL"] = "LOCAL";
    BuildVariant["STAGING"] = "STAGING";
    BuildVariant["PROD"] = "PROD";
})(BuildVariant || (exports.BuildVariant = BuildVariant = {}));
class BuildVariantService {
    static instance;
    variant;
    constructor() {
        const rawVariant = process.env.BUILD_VARIANT?.toUpperCase();
        if (rawVariant === 'PROD') {
            this.variant = BuildVariant.PROD;
        }
        else if (rawVariant === 'STAGING') {
            this.variant = BuildVariant.STAGING;
        }
        else {
            this.variant = BuildVariant.LOCAL;
        }
    }
    static getInstance() {
        if (!BuildVariantService.instance) {
            BuildVariantService.instance = new BuildVariantService();
        }
        return BuildVariantService.instance;
    }
    // ONLY for testing
    static resetInstance() {
        BuildVariantService.instance = undefined;
    }
    getVariant() {
        return this.variant;
    }
    isLocal() {
        return this.variant === BuildVariant.LOCAL;
    }
    isStaging() {
        return this.variant === BuildVariant.STAGING;
    }
    isProd() {
        return this.variant === BuildVariant.PROD;
    }
    isSimulatorAllowed() {
        if (this.isLocal())
            return true;
        if (this.isStaging())
            return process.env.ENABLE_SIMULATOR === 'true';
        return false; // PROD never allows simulators
    }
    getLoggingLevel() {
        if (this.isLocal())
            return 'debug';
        if (this.isStaging())
            return 'info';
        return 'warn'; // PROD
    }
    getSupabaseConfig() {
        let url = '';
        let key = '';
        let serviceRoleKey = '';
        if (this.isLocal()) {
            url = process.env.LOCAL_SUPABASE_URL || process.env.SUPABASE_URL || '';
            key = process.env.LOCAL_SUPABASE_KEY || process.env.SUPABASE_KEY || '';
            serviceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
        }
        else if (this.isStaging()) {
            url = process.env.STAGING_SUPABASE_URL || process.env.SUPABASE_URL || 'https://rpcjelhacmkhzguljdgi.supabase.co';
            key = process.env.STAGING_SUPABASE_KEY || process.env.SUPABASE_KEY || 'dummy-key-prevent-crash';
            serviceRoleKey = process.env.STAGING_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
        }
        else if (this.isProd()) {
            url = process.env.PROD_SUPABASE_URL || process.env.SUPABASE_URL || '';
            key = process.env.PROD_SUPABASE_KEY || process.env.SUPABASE_KEY || 'dummy-key-prevent-crash';
            serviceRoleKey = process.env.PROD_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
        }
        if (!url || !key) {
            console.warn(`[BuildVariantService] Warning: Missing Supabase credentials for variant ${this.variant}`);
        }
        return { url, key, serviceRoleKey };
    }
}
exports.BuildVariantService = BuildVariantService;
class FeatureGateService {
    static isFeatureEnabled(featureName) {
        const variantService = BuildVariantService.getInstance();
        // Example logic for feature flags based on variant
        switch (featureName) {
            case 'mock_data':
                return variantService.isLocal();
            case 'real_money_payouts':
                return variantService.isProd();
            case 'verbose_telemetry':
                return variantService.isLocal() || variantService.isStaging();
            default:
                // Default check against env var explicitly if defined
                return process.env[`FEATURE_${featureName.toUpperCase()}`] === 'true';
        }
    }
}
exports.FeatureGateService = FeatureGateService;
//# sourceMappingURL=build-variant.js.map