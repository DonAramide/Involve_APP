/**
 * Resolve Quasar tenant API key environment for activate / rotate.
 * Production Invify (BUILD_VARIANT=PROD) → live (sk_live_*).
 * Staging / local → test (sk_test_*).
 *
 * Optional override: QUASAR_TENANT_KEY_ENVIRONMENT=live|test
 */
import { BuildVariantService } from '../../config/build-variant';

export type QuasarTenantKeyEnvironment = 'live' | 'test';

const LIVE_SCOPES = [
  'payments:create',
  'payments:read',
  'wallets:read',
  'transfers:create',
  'transfers:read',
  'virtual_accounts:read',
  'virtual_accounts:write',
  'webhooks:endpoints:manage',
  'webhooks:read',
  'integration:read',
  'pos:icc:write',
  'pos:card:execute',
];

const TEST_SCOPES = [
  ...LIVE_SCOPES,
  'sandbox:read',
  'sandbox:write',
  'financial_routing:read',
];

export function resolveQuasarTenantKeyEnvironment(): QuasarTenantKeyEnvironment {
  const override = String(process.env.QUASAR_TENANT_KEY_ENVIRONMENT || '')
    .trim()
    .toLowerCase();
  if (override === 'live' || override === 'test') return override;

  return BuildVariantService.getInstance().isProd() ? 'live' : 'test';
}

export function scopesForQuasarTenantKeyEnvironment(
  environment: QuasarTenantKeyEnvironment,
): string[] {
  return environment === 'live' ? [...LIVE_SCOPES] : [...TEST_SCOPES];
}
