"use strict";
// src/services/qfs-quasar-bridge.service.ts
/**
 * Proxies Invify `/api/v1/sandbox/*` to Quasar Financial Sandbox.
 *
 * Auth path:
 *   1. Client presents Invify-minted sk_test_* (qfs_api_keys) → resolves Invify tenantId
 *   2. Bridge loads Quasar sk_test_* from quasar_integrations for that tenant
 *   3. Calls Quasar /api/v1/sandbox/* so VAs appear in Quasar admin
 *
 * Set QFS_USE_QUASAR=false to fall back to the local Supabase stub.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QfsQuasarBridgeService = void 0;
exports.toInvifyAccountShape = toInvifyAccountShape;
exports.resolveInvifyServiceSlug = resolveInvifyServiceSlug;
const quasar_provisioning_service_1 = require("../integrations/quasar/quasar-provisioning.service");
const quasar_integration_store_1 = require("../integrations/quasar/quasar-integration.store");
const quasar_api_client_1 = require("../integrations/quasar/quasar-api.client");
const qfs_sandbox_service_1 = require("./qfs-sandbox.service");
const INVIFY_SERVICE_SLUGS = [
    'invify_retail',
    'invify_school',
    'invify_services',
];
function useQuasarBackend() {
    const flag = (process.env.QFS_USE_QUASAR ?? 'true').trim().toLowerCase();
    return flag !== 'false' && flag !== '0' && flag !== 'local';
}
/** Map Quasar camelCase VA → Invify legacy snake_case row shape. */
function toInvifyAccountShape(va) {
    const balanceKobo = Number.parseInt(String(va.availableBalance ?? '0'), 10);
    return {
        id: va.id,
        tenant_id: va.tenantId,
        account_number: va.accountNumber,
        account_name: va.accountName,
        bank_code: va.bankCode,
        bank_name: va.bankName,
        currency: va.currency,
        balance_kobo: Number.isFinite(balanceKobo) ? balanceKobo : 0,
        is_active: String(va.status).toUpperCase() === 'ACTIVE',
        metadata: {
            serviceSlug: va.serviceSlug,
            environment: va.environment,
            source: 'quasar',
        },
        created_at: va.createdAt,
        updated_at: va.updatedAt,
        tenantId: va.tenantId,
        accountNumber: va.accountNumber,
        accountName: va.accountName,
        bankCode: va.bankCode,
        bankName: va.bankName,
        availableBalance: va.availableBalance,
        status: va.status,
        serviceSlug: va.serviceSlug,
        environment: va.environment,
    };
}
/**
 * Resolve Quasar Service Catalog slug for this Invify tenant.
 * Prefer quasar_integrations.quasar_vertical (invify_school|retail|services).
 * Falls back to QUASAR_DEFAULT_SERVICE_SLUG when using general QUASAR_API_KEY.
 */
async function resolveInvifyServiceSlug(invifyTenantId, override) {
    const integration = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(invifyTenantId);
    const fromEnv = (process.env.QUASAR_DEFAULT_SERVICE_SLUG || 'invify_retail')
        .trim()
        .toLowerCase();
    const fromIntegration = integration?.quasar_vertical;
    const resolvedDefault = fromIntegration && INVIFY_SERVICE_SLUGS.includes(fromIntegration)
        ? fromIntegration
        : INVIFY_SERVICE_SLUGS.includes(fromEnv)
            ? fromEnv
            : 'invify_retail';
    if (!integration && !quasar_provisioning_service_1.QuasarProvisioningService.hasGeneralApiKey()) {
        throw new Error(`Tenant is not provisioned on Quasar Financial Sandbox. ` +
            `Provision the merchant first, or set QUASAR_API_KEY=sk_test_…`);
    }
    if (!override?.trim()) {
        return resolvedDefault;
    }
    const normalized = override.trim().toLowerCase();
    if (!INVIFY_SERVICE_SLUGS.includes(normalized)) {
        throw new Error(`Invalid serviceSlug "${override}". Use one of: ${INVIFY_SERVICE_SLUGS.join(', ')}`);
    }
    if (fromIntegration && normalized !== fromIntegration) {
        throw new Error(`Tenant is provisioned as "${fromIntegration}", not "${normalized}". ` +
            `Omit serviceSlug to use the tenant vertical automatically.`);
    }
    return normalized;
}
async function quasarClient(invifyTenantId) {
    try {
        return await quasar_provisioning_service_1.QuasarProvisioningService.getPaymentsClient(invifyTenantId);
    }
    catch (err) {
        throw new Error(`Tenant is not provisioned on Quasar Financial Sandbox. ` +
            `Provision the merchant first (Quasar integration missing). ${err?.message ?? ''}`.trim());
    }
}
function rethrowQuasar(err) {
    if (err instanceof quasar_api_client_1.QuasarApiError) {
        const hint = err.responseCode === '403' || /scope/i.test(err.message)
            ? ' Ensure the Quasar tenant API key has sandbox:read and sandbox:write scopes.'
            : '';
        throw new Error(`Quasar sandbox error: ${err.message}.${hint}`);
    }
    throw err instanceof Error ? err : new Error(String(err));
}
class QfsQuasarBridgeService {
    static isQuasarMode() {
        return useQuasarBackend();
    }
    static async getSession(tenantId, keyId) {
        if (!useQuasarBackend()) {
            return qfs_sandbox_service_1.QfsSandboxService.getSession(tenantId, keyId);
        }
        try {
            const client = await quasarClient(tenantId);
            const remote = await client.getSandboxInfo();
            const list = await client.getSandboxAccounts({ page: 1, limit: 1 });
            return {
                tenantId: remote?.tenantId ?? tenantId,
                tenantName: remote?.tenantName,
                environment: remote?.environment ?? 'TEST',
                keyId: remote?.apiKeyId ?? keyId,
                accountCount: list?.total ?? 0,
                backend: 'quasar',
                basePath: remote?.basePath ?? '/api/v1/sandbox',
                scopes: remote?.scopes ?? null,
            };
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async bootstrap(tenantId, webhookUrl, socketChannel) {
        if (!useQuasarBackend()) {
            return qfs_sandbox_service_1.QfsSandboxService.bootstrap(tenantId, webhookUrl, socketChannel);
        }
        try {
            const client = await quasarClient(tenantId);
            return await client.bootstrapSandbox({
                sandboxWebhookUrl: webhookUrl,
                sandboxSocketChannel: socketChannel,
            });
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async getConfig(tenantId) {
        if (!useQuasarBackend())
            return qfs_sandbox_service_1.QfsSandboxService.getConfig(tenantId);
        try {
            return await (await quasarClient(tenantId)).getSandboxConfig();
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async updateConfig(tenantId, patch) {
        if (!useQuasarBackend())
            return qfs_sandbox_service_1.QfsSandboxService.updateConfig(tenantId, patch);
        try {
            return await (await quasarClient(tenantId)).updateSandboxConfig({
                sandboxWebhookUrl: patch.webhookUrl,
                sandboxSocketChannel: patch.socketChannel,
                chaosMode: patch.chaosMode,
            });
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async generateSecret(tenantId) {
        if (!useQuasarBackend())
            return qfs_sandbox_service_1.QfsSandboxService.generateSecret(tenantId);
        try {
            return await (await quasarClient(tenantId)).generateSandboxSecret();
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async getBanks(tenantId) {
        if (!useQuasarBackend() || !tenantId) {
            return qfs_sandbox_service_1.QfsSandboxService.getBanks();
        }
        try {
            const { items } = await (await quasarClient(tenantId)).lookupSandboxBanks();
            return items.map((b) => ({
                code: b.code,
                name: b.name,
                shortName: b.slug?.slice(0, 3).toUpperCase() ?? b.code,
                nip: b.code !== '999',
                providers: b.processors ?? [],
            }));
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    /**
     * Providers + nested banks for preferred-bank pickers (before generate).
     */
    static async listBankProviders(tenantId, q) {
        if (!useQuasarBackend()) {
            const banks = qfs_sandbox_service_1.QfsSandboxService.getBanks().map((b) => ({
                code: b.code,
                name: b.name,
                slug: b.shortName?.toLowerCase() ?? b.code,
                country: 'NG',
                currency: 'NGN',
                active: true,
                providers: b.code === '999' ? ['quasar_bank'] : ['paystack', 'flutterwave'],
            }));
            const byProvider = new Map();
            for (const bank of banks) {
                for (const p of bank.providers) {
                    const list = byProvider.get(p) ?? [];
                    list.push(bank);
                    byProvider.set(p, list);
                }
            }
            const providers = [...byProvider.entries()].map(([id, list]) => ({
                id,
                name: id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                bankCount: list.length,
                banks: list.map(({ providers: _p, ...rest }) => rest),
            }));
            return {
                defaultBankCode: '999',
                defaultBankName: 'Quasar Test Bank',
                providers,
                banks,
                totalBanks: banks.length,
                totalProviders: providers.length,
                backend: 'local',
            };
        }
        try {
            const data = await (await quasarClient(tenantId)).getSandboxBankProviders(q ? { q } : undefined);
            return { ...data, backend: 'quasar' };
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async lookupBanks(tenantId, q, code) {
        if (!useQuasarBackend() || !tenantId) {
            return qfs_sandbox_service_1.QfsSandboxService.lookupBanks(q, code);
        }
        try {
            const { items } = await (await quasarClient(tenantId)).lookupSandboxBanks({ q, code });
            return items.map((b) => ({
                code: b.code,
                name: b.name,
                shortName: b.slug?.slice(0, 3).toUpperCase() ?? b.code,
                nip: b.code !== '999',
            }));
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async generateAccounts(tenantId, accountName, count = 1, bankCode, bankName, serviceSlugOverride) {
        if (!useQuasarBackend()) {
            const accounts = await qfs_sandbox_service_1.QfsSandboxService.generateAccounts(tenantId, accountName, count, bankCode, bankName);
            return { accounts: accounts, quasarPayload: null };
        }
        try {
            const serviceSlug = await resolveInvifyServiceSlug(tenantId, serviceSlugOverride);
            const client = await quasarClient(tenantId);
            // Full Quasar generate payload (tenant comes from Quasar sk_test_* — never in body)
            const quasarPayload = {
                serviceSlug,
                accountName,
                count,
                bankCode,
                bankName,
            };
            const accounts = await client.generateSandboxAccounts(quasarPayload);
            const list = Array.isArray(accounts) ? accounts : [];
            return {
                accounts: list.map(toInvifyAccountShape),
                quasarPayload,
            };
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async listAccounts(tenantId) {
        if (!useQuasarBackend())
            return qfs_sandbox_service_1.QfsSandboxService.listAccounts(tenantId);
        try {
            const client = await quasarClient(tenantId);
            // Fetch up to 100 (Quasar page max) for Invify list contract
            const page = await client.getSandboxAccounts({ page: 1, limit: 100 });
            return (page.items ?? []).map(toInvifyAccountShape);
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async getAccount(tenantId, id) {
        if (!useQuasarBackend())
            return qfs_sandbox_service_1.QfsSandboxService.getAccount(tenantId, id);
        try {
            const va = await (await quasarClient(tenantId)).getSandboxAccount(id);
            return toInvifyAccountShape(va);
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async credit(tenantId, accountId, amountKobo, reason = 'Manual Credit', currency = 'NGN', correlationId) {
        if (!useQuasarBackend()) {
            return qfs_sandbox_service_1.QfsSandboxService.credit(tenantId, accountId, amountKobo, reason, currency, correlationId);
        }
        try {
            return await (await quasarClient(tenantId)).creditSandboxAccount(accountId, { amount: amountKobo, reason: reason || 'Manual Credit', currency }, { correlationId });
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async debit(tenantId, accountId, amountKobo, reason = 'Manual Debit', currency = 'NGN', correlationId) {
        if (!useQuasarBackend()) {
            return qfs_sandbox_service_1.QfsSandboxService.debit(tenantId, accountId, amountKobo, reason, currency, correlationId);
        }
        try {
            return await (await quasarClient(tenantId)).debitSandboxAccount(accountId, { amount: amountKobo, reason: reason || 'Manual Debit', currency }, { correlationId });
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async getLedger(tenantId, accountId, limit = 50, offset = 0, opts) {
        if (!useQuasarBackend())
            return qfs_sandbox_service_1.QfsSandboxService.getLedger(tenantId, accountId, limit, offset);
        try {
            const page = Math.floor(offset / Math.max(limit, 1)) + 1;
            const result = await (await quasarClient(tenantId)).getSandboxLedger(accountId, {
                page,
                limit,
            }, opts);
            return result?.items ?? result?.entries ?? result ?? [];
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async getBalanceSnapshots(tenantId, accountId) {
        if (!useQuasarBackend())
            return qfs_sandbox_service_1.QfsSandboxService.getBalanceSnapshots(tenantId, accountId);
        try {
            const result = await (await quasarClient(tenantId)).getSandboxBalanceSnapshots(accountId);
            return result?.items ?? result?.snapshots ?? result ?? [];
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async getAuditLogs(tenantId, limit = 50, offset = 0) {
        if (!useQuasarBackend())
            return qfs_sandbox_service_1.QfsSandboxService.getAuditLogs(tenantId, limit, offset);
        try {
            const page = Math.floor(offset / Math.max(limit, 1)) + 1;
            const result = await (await quasarClient(tenantId)).getSandboxAuditLogs({ page, limit });
            return result?.items ?? result?.logs ?? result ?? [];
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async getTimeline(tenantId, limit = 50) {
        if (!useQuasarBackend())
            return qfs_sandbox_service_1.QfsSandboxService.getTimeline(tenantId, limit);
        try {
            const result = await (await quasarClient(tenantId)).getSandboxTimeline({ limit });
            return result?.items ?? result?.events ?? result ?? [];
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async getTimelineByCorrelation(tenantId, correlationId) {
        if (!useQuasarBackend()) {
            return qfs_sandbox_service_1.QfsSandboxService.getTimelineByCorrelation(tenantId, correlationId);
        }
        try {
            return await (await quasarClient(tenantId)).getSandboxTimelineByCorrelation(correlationId);
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async createTransfer(tenantId, body) {
        if (!useQuasarBackend())
            return qfs_sandbox_service_1.QfsSandboxService.createTransfer(tenantId, body);
        try {
            const amount = body.amount ?? body.amountKobo;
            if (!amount)
                throw new Error('amount (kobo) is required');
            return await (await quasarClient(tenantId)).createSandboxTransfer({
                virtualAccountId: body.virtualAccountId ?? body.fromAccountId,
                destinationVirtualAccountId: body.destinationVirtualAccountId ?? body.toAccountId,
                direction: body.direction ?? 'OUTGOING',
                amount: Number(amount),
                currency: body.currency || 'NGN',
                narration: body.narration,
                provider: body.provider || 'QUASAR_BANK',
                reference: body.reference,
                requiresApproval: body.requiresApproval ?? false,
            }, { correlationId: body.correlationId });
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async generateTransfer(tenantId, profileId) {
        if (!useQuasarBackend())
            return qfs_sandbox_service_1.QfsSandboxService.generateTransfer(tenantId, profileId);
        try {
            return await (await quasarClient(tenantId)).generateSandboxTransfer({ profileId });
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async listTransfers(tenantId, limit = 50, offset = 0) {
        if (!useQuasarBackend())
            return qfs_sandbox_service_1.QfsSandboxService.listTransfers(tenantId, limit, offset);
        try {
            const page = Math.floor(offset / Math.max(limit, 1)) + 1;
            const result = await (await quasarClient(tenantId)).listSandboxTransfers({ page, limit });
            return result?.items ?? result?.transfers ?? result ?? [];
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async getTransfer(tenantId, id) {
        if (!useQuasarBackend())
            return qfs_sandbox_service_1.QfsSandboxService.getTransfer(tenantId, id);
        try {
            return await (await quasarClient(tenantId)).getSandboxTransfer(id);
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async transitionTransfer(tenantId, id, action) {
        if (!useQuasarBackend())
            return qfs_sandbox_service_1.QfsSandboxService.transitionTransfer(tenantId, id, action);
        try {
            return await (await quasarClient(tenantId)).transitionSandboxTransfer(id, action);
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static async simulateProvider(tenantId, provider, body) {
        if (!useQuasarBackend())
            return qfs_sandbox_service_1.QfsSandboxService.simulateProvider(tenantId, provider, body);
        try {
            return await (await quasarClient(tenantId)).simulateSandboxProvider(provider, body);
        }
        catch (err) {
            rethrowQuasar(err);
        }
    }
    static getProfiles() {
        return qfs_sandbox_service_1.TRANSACTION_PROFILES;
    }
    static getProvidersCatalog() {
        return qfs_sandbox_service_1.PSP_PROVIDERS;
    }
}
exports.QfsQuasarBridgeService = QfsQuasarBridgeService;
//# sourceMappingURL=qfs-quasar-bridge.service.js.map