export enum BuildVariant {
  LOCAL = 'LOCAL',
  STAGING = 'STAGING',
  PROD = 'PROD'
}

export class BuildVariantService {
  private static instance: BuildVariantService;
  private readonly variant: BuildVariant;
  
  private constructor() {
    const rawVariant = process.env.BUILD_VARIANT?.toUpperCase();
    if (rawVariant === 'PROD') {
      this.variant = BuildVariant.PROD;
    } else if (rawVariant === 'STAGING') {
      this.variant = BuildVariant.STAGING;
    } else {
      this.variant = BuildVariant.LOCAL;
    }
  }

  public static getInstance(): BuildVariantService {
    if (!BuildVariantService.instance) {
      BuildVariantService.instance = new BuildVariantService();
    }
    return BuildVariantService.instance;
  }

  // ONLY for testing
  public static resetInstance(): void {
    (BuildVariantService as any).instance = undefined;
  }

  public getVariant(): BuildVariant {
    return this.variant;
  }

  public isLocal(): boolean {
    return this.variant === BuildVariant.LOCAL;
  }

  public isStaging(): boolean {
    return this.variant === BuildVariant.STAGING;
  }

  public isProd(): boolean {
    return this.variant === BuildVariant.PROD;
  }

  public isSimulatorAllowed(): boolean {
    if (this.isLocal()) return true;
    if (this.isStaging()) return process.env.ENABLE_SIMULATOR === 'true';
    return false; // PROD never allows simulators
  }

  public getLoggingLevel(): 'debug' | 'info' | 'warn' | 'error' {
    if (this.isLocal()) return 'debug';
    if (this.isStaging()) return 'info';
    return 'warn'; // PROD
  }

  public getSupabaseConfig(): { url: string; key: string; serviceRoleKey: string } {
    let url = '';
    let key = '';
    let serviceRoleKey = '';

    if (this.isLocal()) {
      url = process.env.LOCAL_SUPABASE_URL || process.env.SUPABASE_URL || '';
      key = process.env.LOCAL_SUPABASE_KEY || process.env.SUPABASE_KEY || '';
      serviceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
    } else if (this.isStaging()) {
      url = process.env.STAGING_SUPABASE_URL || process.env.SUPABASE_URL || 'https://rpcjelhacmkhzguljdgi.supabase.co';
      key = process.env.STAGING_SUPABASE_KEY || process.env.SUPABASE_KEY || 'dummy-key-prevent-crash';
      serviceRoleKey = process.env.STAGING_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
    } else if (this.isProd()) {
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

export class FeatureGateService {
  public static isFeatureEnabled(featureName: string): boolean {
    const variantService = BuildVariantService.getInstance();
    
    // Example logic for feature flags based on variant
    switch(featureName) {
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
