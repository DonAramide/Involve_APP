import { BuildVariantService } from './build-variant';
import { supabaseProjectUrl } from '../utils/supabase-jwt';

function parseHostname(value: string): string {
  let normalized = value.trim().toLowerCase();
  if (!normalized.includes('://')) {
    normalized = 'https://' + normalized;
  }
  try {
    const url = new URL(normalized);
    return url.hostname;
  } catch (e) {
    return normalized;
  }
}

function isProductionDomain(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  const isProdInvifyOrg = lower === 'invify.org' || lower.endsWith('.invify.org');
  const isProdIipsApp = lower === 'iips.app' || lower.endsWith('.iips.app');
  const isProdInvifyApp = lower === 'invify.app' || lower.endsWith('.invify.app');
  
  if (isProdInvifyOrg || isProdIipsApp || isProdInvifyApp) {
    if (lower === 'staging.invify.org' || lower === 'staging.iips.app' || lower === 'staging.invify.app') {
      return false;
    }
    return true;
  }
  return false;
}

/** Known insecure defaults — never acceptable in staging/production runtime. */
const INSECURE_SIGNING_DEFAULTS = new Set([
  'your-super-secret-key-2026',
  'invify-fintech-fallback-secret-2026',
  'super-secret-jwt-key-for-local-testing',
  'local-dev-jwt-secret-change-me!!',
  'local-dev-supabase-jwt-secret!',
  'local-dev-license-hmac-secret!!',
]);

function looksLikeInsecureSigningSecret(value: string | undefined): boolean {
  if (!value) return false;
  return INSECURE_SIGNING_DEFAULTS.has(value);
}

function looksLikeDevEndpoint(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  return (
    v.includes('localhost') ||
    v.includes('127.0.0.1') ||
    v.includes('0.0.0.0') ||
    v.includes('192.168.') ||
    v.includes('10.0.') ||
    v.includes('ngrok') ||
    v.includes('example.com')
  );
}

/**
 * Fail-closed startup assertions for staging/production.
 * Call once during boot before accepting traffic.
 */
export function assertSecureBootConfiguration(): void {
  const variant = BuildVariantService.getInstance();
  const isProdEnv =
    process.env.NODE_ENV === 'production' ||
    process.env.APP_ENV === 'production' ||
    process.env.BUILD_PROFILE === 'production' ||
    variant.isProd();
  const isStaging = variant.isStaging() || process.env.NODE_ENV === 'staging' || process.env.APP_ENV === 'staging';

  if (isProdEnv && !variant.isProd()) {
    throw new Error(
      `[SecurityBoot] Refusing to start: production NODE_ENV/APP_ENV requires BUILD_VARIANT=PROD (got ${variant.getVariant()})`,
    );
  }

  if (isProdEnv || isStaging) {
    if (process.env.OFFLINE_LOCAL_AUTH === 'true' || process.env.OFFLINE_MOCK_AUTH === 'true') {
      throw new Error(
        `[SecurityBoot] Refusing to start: offline/mock auth flags are set while variant=${variant.getVariant()} NODE_ENV=${process.env.NODE_ENV}`,
      );
    }
    if (process.env.ENABLE_SIMULATOR === 'true' && variant.isProd()) {
      throw new Error('[SecurityBoot] Refusing to start: ENABLE_SIMULATOR is forbidden in PROD');
    }
    const hasValidSecret = process.env.SUPABASE_JWT_SECRET &&
                           process.env.SUPABASE_JWT_SECRET.length >= 16;

    const supabaseUrl = supabaseProjectUrl();

    const hasValidJwks = supabaseUrl && !looksLikeDevEndpoint(supabaseUrl);

    if (!hasValidSecret && !hasValidJwks) {
      throw new Error(
        `[SecurityBoot] Refusing to start: Neither a valid HS256 configuration (SUPABASE_JWT_SECRET) nor a valid asymmetric configuration (SUPABASE_URL) exists in ${variant.getVariant()}`,
      );
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
      throw new Error(
        `[SecurityBoot] Refusing to start: JWT_SECRET is required in ${variant.getVariant()}`,
      );
    }
    if (!process.env.LICENSE_HMAC_SECRET || process.env.LICENSE_HMAC_SECRET.length < 16) {
      throw new Error(
        `[SecurityBoot] Refusing to start: LICENSE_HMAC_SECRET is required in ${variant.getVariant()}`,
      );
    }
    if (
      looksLikeInsecureSigningSecret(process.env.JWT_SECRET) ||
      looksLikeInsecureSigningSecret(process.env.SUPABASE_JWT_SECRET) ||
      looksLikeInsecureSigningSecret(process.env.LICENSE_HMAC_SECRET)
    ) {
      throw new Error(
        `[SecurityBoot] Refusing to start: JWT_SECRET/SUPABASE_JWT_SECRET/LICENSE_HMAC_SECRET is a known insecure default in ${variant.getVariant()}`,
      );
    }

    if (looksLikeDevEndpoint(supabaseUrl)) {
      throw new Error('[SecurityBoot] Refusing to start: Supabase URL looks like a development endpoint');
    }
    if (looksLikeDevEndpoint(process.env.APP_URL) || looksLikeDevEndpoint(process.env.BASE_URL)) {
      throw new Error('[SecurityBoot] Refusing to start: APP_URL/BASE_URL looks like a development endpoint');
    }
    if (looksLikeDevEndpoint(process.env.QUASAR_BASE_URL)) {
      throw new Error('[SecurityBoot] Refusing to start: QUASAR_BASE_URL looks like a development endpoint');
    }

    // Require explicit DB target configuration presence (URL may be via SUPABASE_*)
    try {
      variant.getSupabaseConfig();
    } catch (err: any) {
      throw new Error(`[SecurityBoot] ${err?.message || err}`);
    }

    if (isStaging) {
      const publishable = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY || '';
      const secret = process.env.STAGING_SUPABASE_SECRET_KEY || '';
      if (!publishable.startsWith('sb_publishable_')) {
        throw new Error(
          '[SecurityBoot] Refusing to start: STAGING_SUPABASE_PUBLISHABLE_KEY must be a publishable key (sb_publishable_*)',
        );
      }
      if (!secret.startsWith('sb_secret_')) {
        throw new Error(
          '[SecurityBoot] Refusing to start: STAGING_SUPABASE_SECRET_KEY must be a secret key (sb_secret_*)',
        );
      }
      if (
        process.env.STAGING_SUPABASE_KEY ||
        process.env.STAGING_SUPABASE_SERVICE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY
      ) {
        throw new Error(
          '[SecurityBoot] Refusing to start: legacy STAGING_SUPABASE_KEY / STAGING_SUPABASE_SERVICE_KEY / SUPABASE_SERVICE_ROLE_KEY must not be set in staging runtime',
        );
      }
      const corsOrigins = process.env.CORS_ORIGINS || '';
      const origins = corsOrigins.split(',').map(o => o.trim()).filter(Boolean);
      for (const origin of origins) {
        if (origin === '*') {
          throw new Error('[SecurityBoot] Refusing to start: Wildcard CORS is strictly forbidden in STAGING/PRODUCTION');
        }
        const hostname = parseHostname(origin);
        if (isProductionDomain(hostname)) {
          throw new Error('[SecurityBoot] Refusing to start: Production domains must not be allowed in STAGING CORS_ORIGINS');
        }
      }
      const stagingUrl = process.env.STAGING_SUPABASE_URL || '';
      if (stagingUrl) {
        const stagingHostname = parseHostname(stagingUrl);
        if (isProductionDomain(stagingHostname)) {
          throw new Error('[SecurityBoot] Refusing to start: Production domains must not be used for STAGING_SUPABASE_URL');
        }
      }
    }

    if (variant.isProd() || isProdEnv) {
      const publishable = process.env.PROD_SUPABASE_PUBLISHABLE_KEY || '';
      const secret = process.env.PROD_SUPABASE_SECRET_KEY || '';
      if (!publishable.startsWith('sb_publishable_')) {
        throw new Error(
          '[SecurityBoot] Refusing to start: PROD_SUPABASE_PUBLISHABLE_KEY must be a publishable key (sb_publishable_*)',
        );
      }
      if (!secret.startsWith('sb_secret_')) {
        throw new Error(
          '[SecurityBoot] Refusing to start: PROD_SUPABASE_SECRET_KEY must be a secret key (sb_secret_*)',
        );
      }
      if (
        process.env.PROD_SUPABASE_KEY ||
        process.env.PROD_SUPABASE_SERVICE_KEY ||
        process.env.PROD_SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY
      ) {
        throw new Error(
          '[SecurityBoot] Refusing to start: legacy PROD_SUPABASE_KEY / PROD_SUPABASE_SERVICE_KEY / SUPABASE_KEY / SUPABASE_SERVICE_ROLE_KEY must not be set in production runtime',
        );
      }

      const corsOrigins = process.env.CORS_ORIGINS || '';
      const origins = corsOrigins.split(',').map(o => o.trim()).filter(Boolean);
      for (const origin of origins) {
        if (origin === '*') {
          throw new Error('[SecurityBoot] Refusing to start: Wildcard CORS is strictly forbidden in STAGING/PRODUCTION');
        }
      }

      const agentUrl = variant.getAgentPortalUrl();
      if (!agentUrl.startsWith('https://')) {
        throw new Error('[SecurityBoot] Refusing to start: PROD_AGENT_PORTAL_URL must use HTTPS in PRODUCTION');
      }
      const lowerUrl = agentUrl.toLowerCase();
      const banned = ['localhost', '127.0.0.1', '192.168.', '10.0.', 'ngrok', 'staging.invify.local', 'staging-api.invify.local'];
      if (banned.some((b) => lowerUrl.includes(b))) {
        throw new Error(`[SecurityBoot] Refusing to start: PROD_AGENT_PORTAL_URL contains banned development/staging host in PRODUCTION: ${agentUrl}`);
      }
    }
  }

  if (
    process.env.NODE_ENV === 'production' &&
    (process.env.OFFLINE_LOCAL_AUTH === 'true' || process.env.OFFLINE_MOCK_AUTH === 'true')
  ) {
    throw new Error('[SecurityBoot] Refusing to start: mock auth enabled with NODE_ENV=production');
  }
}
