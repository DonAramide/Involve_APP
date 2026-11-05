"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveQuasarTenantKeyEnvironment = resolveQuasarTenantKeyEnvironment;
exports.scopesForQuasarTenantKeyEnvironment = scopesForQuasarTenantKeyEnvironment;
/**
 * Resolve Quasar tenant API key environment for activate / rotate.
 * Production Invify (BUILD_VARIANT=PROD) → live (sk_live_*).
 * Staging / local → test (sk_test_*).
 *
 * Optional override: QUASAR_TENANT_KEY_ENVIRONMENT=live|test
 */
const build_variant_1 = require("../../config/build-variant");
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
    // Required for Settlement Destination bank list + account name enquiry
    'financial_routing:read',
];
const TEST_SCOPES = [
    ...LIVE_SCOPES,
    'sandbox:read',
    'sandbox:write',
];
function resolveQuasarTenantKeyEnvironment() {
    const override = String(process.env.QUASAR_TENANT_KEY_ENVIRONMENT || '')
        .trim()
        .toLowerCase();
    if (override === 'live' || override === 'test')
        return override;
    return build_variant_1.BuildVariantService.getInstance().isProd() ? 'live' : 'test';
}
function scopesForQuasarTenantKeyEnvironment(environment) {
    return environment === 'live' ? [...LIVE_SCOPES] : [...TEST_SCOPES];
}
//# sourceMappingURL=quasar-tenant-key-environment.js.map