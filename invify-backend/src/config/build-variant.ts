/**
 * Explicit environment / build-variant resolution.
 *
 * Safety rules (Phase 3):
 * - NODE_ENV=production OR APP_ENV=production requires BUILD_VARIANT=PROD (or APP_ENV=production with BUILD_VARIANT=PROD).
 * - Missing BUILD_VARIANT never silently becomes LOCAL when the process claims production.
 * - Staging must be explicit BUILD_VARIANT=STAGING (or APP_ENV=staging).
 */
export enum BuildVariant {
  LOCAL = 'LOCAL',
  STAGING = 'STAGING',
  PROD = 'PROD'
}

function resolveVariant(): BuildVariant {
  const rawVariant = (process.env.BUILD_VARIANT || '').trim().toUpperCase();
  const appEnv = (process.env.APP_ENV || '').trim().toLowerCase();
  const nodeEnv = (process.env.NODE_ENV || '').trim().toLowerCase();
  const buildProfile = (process.env.BUILD_PROFILE || '').trim().toLowerCase();

  const claimsProduction =
    nodeEnv === 'production' ||
    appEnv === 'production' ||
    buildProfile === 'production';

  const claimsStaging =
    nodeEnv === 'staging' ||
    appEnv === 'staging' ||
    buildProfile === 'staging';

  if (rawVariant === 'PROD' || rawVariant === 'PRODUCTION') {
    return BuildVariant.PROD;
  }
  if (rawVariant === 'STAGING') {
    return BuildVariant.STAGING;
  }
  if (rawVariant === 'LOCAL' || rawVariant === 'DEVELOPMENT' || rawVariant === 'DEV') {
    if (claimsProduction) {
      throw new Error(
        `[BuildVariant] Refusing LOCAL while NODE_ENV/APP_ENV claims production. Set BUILD_VARIANT=PROD explicitly.`,
      );
    }
    if (claimsStaging) {
      throw new Error(
        `[BuildVariant] Refusing LOCAL while NODE_ENV/APP_ENV claims staging. Set BUILD_VARIANT=STAGING explicitly.`,
      );
    }
    return BuildVariant.LOCAL;
  }

  // BUILD_VARIANT unset
  if (claimsProduction) {
    throw new Error(
      `[BuildVariant] BUILD_VARIANT is required when NODE_ENV/APP_ENV/BUILD_PROFILE indicates production. Set BUILD_VARIANT=PROD.`,
    );
  }
  if (claimsStaging) {
    return BuildVariant.STAGING;
  }

  // Default LOCAL only for explicit non-production local/test development
  return BuildVariant.LOCAL;
}

export class BuildVariantService {
  private static instance: BuildVariantService;
  private readonly variant: BuildVariant;
  
  private constructor() {
    this.variant = resolveVariant();
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

  public getAgentPortalUrl(): string {
    if (this.isLocal()) {
      return process.env.LOCAL_AGENT_PORTAL_URL || 'http://localhost:3000/agent/reset-password';
    }
    if (this.isStaging()) {
      return process.env.STAGING_AGENT_PORTAL_URL || 'http://localhost:3000/agent/reset-password';
    }
    // Production
    const prodUrl = process.env.PROD_AGENT_PORTAL_URL || '';
    if (!prodUrl) {
      throw new Error('[BuildVariantService] PROD_AGENT_PORTAL_URL is required in PRODUCTION');
    }
    return prodUrl;
  }

  /**
   * Environment-scoped Supabase configuration.
   * Staging/Production never fall back to hardcoded project URLs or dummy keys.
   */
  public getSupabaseConfig(): { url: string; key: string; serviceRoleKey: string } {
    let url = '';
    let key = '';
    let serviceRoleKey = '';

    if (this.isLocal()) {
      url = process.env.LOCAL_SUPABASE_URL || process.env.DEV_SUPABASE_URL || process.env.SUPABASE_URL || '';
      key = process.env.LOCAL_SUPABASE_KEY || process.env.DEV_SUPABASE_KEY || process.env.SUPABASE_KEY || '';
      serviceRoleKey =
        process.env.LOCAL_SUPABASE_SERVICE_KEY ||
        process.env.DEV_SUPABASE_SERVICE_KEY ||
        process.env.SUPABASE_SERVICE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        '';
    } else if (this.isStaging()) {
      url = process.env.STAGING_SUPABASE_URL || '';
      key = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY || process.env.STAGING_SUPABASE_KEY || '';
      serviceRoleKey = process.env.STAGING_SUPABASE_SECRET_KEY || process.env.STAGING_SUPABASE_SERVICE_KEY || '';
    } else if (this.isProd()) {
      url = process.env.PROD_SUPABASE_URL || '';
      key = process.env.PROD_SUPABASE_PUBLISHABLE_KEY || process.env.PROD_SUPABASE_KEY || '';
      serviceRoleKey = process.env.PROD_SUPABASE_SECRET_KEY || process.env.PROD_SUPABASE_SERVICE_KEY || '';
    }

    this.assertNoDevEndpoint(url);

    if (!url || !key || !serviceRoleKey) {
      if (this.isStaging()) {
        throw new Error(
          `[BuildVariantService] STAGING requires STAGING_SUPABASE_URL, STAGING_SUPABASE_PUBLISHABLE_KEY, and STAGING_SUPABASE_SECRET_KEY`,
        );
      }
      if (this.isProd()) {
        throw new Error(
          `[BuildVariantService] PRODUCTION requires PROD_SUPABASE_URL, PROD_SUPABASE_PUBLISHABLE_KEY, and PROD_SUPABASE_SECRET_KEY`,
        );
      }
      if (!url || !key) {
        console.warn(`[BuildVariantService] Warning: Missing Supabase credentials for variant ${this.variant}`);
      }
    }

    return { url, key, serviceRoleKey };
  }

  private assertNoDevEndpoint(url: string) {
    if (!url || this.isLocal()) return;
    const lower = url.toLowerCase();
    const banned = ['localhost', '127.0.0.1', '0.0.0.0', '192.168.', '10.0.', 'ngrok'];
    if (banned.some((b) => lower.includes(b))) {
      throw new Error(
        `[BuildVariantService] Refusing ${this.variant}: Supabase URL looks like a development endpoint`,
      );
    }
  }
}

export class FeatureGateService {
  public static isFeatureEnabled(featureName: string): boolean {
    const variantService = BuildVariantService.getInstance();
    
    switch(featureName) {
      case 'mock_data':
        return variantService.isLocal();
      case 'real_money_payouts':
        return process.env.FEATURE_REAL_MONEY_PAYOUTS === 'true' && variantService.isProd();
      case 'verbose_telemetry':
        return variantService.isLocal() || variantService.isStaging();
      default:
        return process.env[`FEATURE_${featureName.toUpperCase()}`] === 'true';
    }
  }
}
