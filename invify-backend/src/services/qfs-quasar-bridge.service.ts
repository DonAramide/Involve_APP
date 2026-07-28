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

import { QuasarProvisioningService } from '../integrations/quasar/quasar-provisioning.service';
import { QuasarIntegrationStore } from '../integrations/quasar/quasar-integration.store';
import type {
  InvifyVertical,
} from '../integrations/quasar/quasar-platform.client';
import type {
  QuasarPaymentsClient,
  SandboxVirtualAccount,
} from '../integrations/quasar/quasar-payments.client';
import { QuasarApiError } from '../integrations/quasar/quasar-api.client';
import {
  QfsSandboxService,
  PSP_PROVIDERS,
  TRANSACTION_PROFILES,
} from './qfs-sandbox.service';

const INVIFY_SERVICE_SLUGS: readonly InvifyVertical[] = [
  'invify_retail',
  'invify_school',
  'invify_services',
];

function useQuasarBackend(): boolean {
  const flag = (process.env.QFS_USE_QUASAR ?? 'true').trim().toLowerCase();
  return flag !== 'false' && flag !== '0' && flag !== 'local';
}

/** Map Quasar camelCase VA → Invify legacy snake_case row shape. */
export function toInvifyAccountShape(va: SandboxVirtualAccount) {
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
export async function resolveInvifyServiceSlug(
  invifyTenantId: string,
  override?: string | null,
): Promise<InvifyVertical> {
  const integration = await QuasarIntegrationStore.getByInvifyTenantId(invifyTenantId);

  const fromEnv = (process.env.QUASAR_DEFAULT_SERVICE_SLUG || 'invify_retail')
    .trim()
    .toLowerCase() as InvifyVertical;
  const fromIntegration = integration?.quasar_vertical as InvifyVertical | undefined;
  const resolvedDefault =
    fromIntegration && INVIFY_SERVICE_SLUGS.includes(fromIntegration)
      ? fromIntegration
      : INVIFY_SERVICE_SLUGS.includes(fromEnv)
        ? fromEnv
        : 'invify_retail';

  if (!integration && !QuasarProvisioningService.hasGeneralApiKey()) {
    throw new Error(
      `Tenant is not provisioned on Quasar Financial Sandbox. ` +
        `Provision the merchant first, or set QUASAR_API_KEY=sk_test_…`,
    );
  }

  if (!override?.trim()) {
    return resolvedDefault;
  }

  const normalized = override.trim().toLowerCase() as InvifyVertical;
  if (!INVIFY_SERVICE_SLUGS.includes(normalized)) {
    throw new Error(
      `Invalid serviceSlug "${override}". Use one of: ${INVIFY_SERVICE_SLUGS.join(', ')}`,
    );
  }
  if (fromIntegration && normalized !== fromIntegration) {
    throw new Error(
      `Tenant is provisioned as "${fromIntegration}", not "${normalized}". ` +
        `Omit serviceSlug to use the tenant vertical automatically.`,
    );
  }
  return normalized;
}

async function quasarClient(invifyTenantId: string): Promise<QuasarPaymentsClient> {
  try {
    return await QuasarProvisioningService.getPaymentsClient(invifyTenantId);
  } catch (err: any) {
    throw new Error(
      `Tenant is not provisioned on Quasar Financial Sandbox. ` +
        `Provision the merchant first (Quasar integration missing). ${err?.message ?? ''}`.trim(),
    );
  }
}

function rethrowQuasar(err: unknown): never {
  if (err instanceof QuasarApiError) {
    const hint =
      err.responseCode === '403' || /scope/i.test(err.message)
        ? ' Ensure the Quasar tenant API key has sandbox:read and sandbox:write scopes.'
        : '';
    throw new Error(`Quasar sandbox error: ${err.message}.${hint}`);
  }
  throw err instanceof Error ? err : new Error(String(err));
}

export class QfsQuasarBridgeService {
  static isQuasarMode(): boolean {
    return useQuasarBackend();
  }

  static async getSession(tenantId: string, keyId: string) {
    if (!useQuasarBackend()) {
      return QfsSandboxService.getSession(tenantId, keyId);
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
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async bootstrap(tenantId: string, webhookUrl: string, socketChannel?: string) {
    if (!useQuasarBackend()) {
      return QfsSandboxService.bootstrap(tenantId, webhookUrl, socketChannel);
    }
    try {
      const client = await quasarClient(tenantId);
      return await client.bootstrapSandbox({
        sandboxWebhookUrl: webhookUrl,
        sandboxSocketChannel: socketChannel,
      });
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async getConfig(tenantId: string) {
    if (!useQuasarBackend()) return QfsSandboxService.getConfig(tenantId);
    try {
      return await (await quasarClient(tenantId)).getSandboxConfig();
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async updateConfig(
    tenantId: string,
    patch: { webhookUrl?: string; socketChannel?: string; chaosMode?: any },
  ) {
    if (!useQuasarBackend()) return QfsSandboxService.updateConfig(tenantId, patch);
    try {
      return await (await quasarClient(tenantId)).updateSandboxConfig({
        sandboxWebhookUrl: patch.webhookUrl,
        sandboxSocketChannel: patch.socketChannel,
        chaosMode: patch.chaosMode,
      });
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async generateSecret(tenantId: string) {
    if (!useQuasarBackend()) return QfsSandboxService.generateSecret(tenantId);
    try {
      return await (await quasarClient(tenantId)).generateSandboxSecret();
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async getBanks(tenantId?: string) {
    if (!useQuasarBackend() || !tenantId) {
      return QfsSandboxService.getBanks();
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
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  /**
   * Providers + nested banks for preferred-bank pickers (before generate).
   */
  static async listBankProviders(tenantId: string, q?: string) {
    if (!useQuasarBackend()) {
      const banks = QfsSandboxService.getBanks().map((b) => ({
        code: b.code,
        name: b.name,
        slug: b.shortName?.toLowerCase() ?? b.code,
        country: 'NG',
        currency: 'NGN',
        active: true,
        providers: b.code === '999' ? ['quasar_bank'] : ['paystack', 'flutterwave'],
      }));
      const byProvider = new Map<string, typeof banks>();
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
        backend: 'local' as const,
      };
    }
    try {
      const data = await (await quasarClient(tenantId)).getSandboxBankProviders(
        q ? { q } : undefined,
      );
      return { ...data, backend: 'quasar' as const };
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async lookupBanks(tenantId: string | undefined, q?: string, code?: string) {
    if (!useQuasarBackend() || !tenantId) {
      return QfsSandboxService.lookupBanks(q, code);
    }
    try {
      const { items } = await (await quasarClient(tenantId)).lookupSandboxBanks({ q, code });
      return items.map((b) => ({
        code: b.code,
        name: b.name,
        shortName: b.slug?.slice(0, 3).toUpperCase() ?? b.code,
        nip: b.code !== '999',
      }));
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async generateAccounts(
    tenantId: string,
    accountName: string,
    count = 1,
    bankCode?: string,
    bankName?: string,
    serviceSlugOverride?: string | null,
  ): Promise<{
    accounts: ReturnType<typeof toInvifyAccountShape>[];
    quasarPayload: {
      serviceSlug: string;
      accountName: string;
      count: number;
      bankCode?: string;
      bankName?: string;
    } | null;
  }> {
    if (!useQuasarBackend()) {
      const accounts = await QfsSandboxService.generateAccounts(
        tenantId,
        accountName,
        count,
        bankCode,
        bankName,
      );
      return { accounts: accounts as any, quasarPayload: null };
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
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async listAccounts(tenantId: string) {
    if (!useQuasarBackend()) return QfsSandboxService.listAccounts(tenantId);
    try {
      const client = await quasarClient(tenantId);
      // Fetch up to 100 (Quasar page max) for Invify list contract
      const page = await client.getSandboxAccounts({ page: 1, limit: 100 });
      return (page.items ?? []).map(toInvifyAccountShape);
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async getAccount(tenantId: string, id: string) {
    if (!useQuasarBackend()) return QfsSandboxService.getAccount(tenantId, id);
    try {
      const va = await (await quasarClient(tenantId)).getSandboxAccount(id);
      return toInvifyAccountShape(va);
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async credit(
    tenantId: string,
    accountId: string,
    amountKobo: number,
    reason = 'Manual Credit',
    currency = 'NGN',
    correlationId?: string,
  ) {
    if (!useQuasarBackend()) {
      return QfsSandboxService.credit(tenantId, accountId, amountKobo, reason, currency, correlationId);
    }
    try {
      return await (await quasarClient(tenantId)).creditSandboxAccount(
        accountId,
        { amount: amountKobo, reason: reason || 'Manual Credit', currency },
        { correlationId },
      );
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async debit(
    tenantId: string,
    accountId: string,
    amountKobo: number,
    reason = 'Manual Debit',
    currency = 'NGN',
    correlationId?: string,
  ) {
    if (!useQuasarBackend()) {
      return QfsSandboxService.debit(tenantId, accountId, amountKobo, reason, currency, correlationId);
    }
    try {
      return await (await quasarClient(tenantId)).debitSandboxAccount(
        accountId,
        { amount: amountKobo, reason: reason || 'Manual Debit', currency },
        { correlationId },
      );
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async getLedger(tenantId: string, accountId: string, limit = 50, offset = 0) {
    if (!useQuasarBackend()) return QfsSandboxService.getLedger(tenantId, accountId, limit, offset);
    try {
      const page = Math.floor(offset / Math.max(limit, 1)) + 1;
      const result = await (await quasarClient(tenantId)).getSandboxLedger(accountId, {
        page,
        limit,
      });
      return result?.items ?? result?.entries ?? result ?? [];
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async getBalanceSnapshots(tenantId: string, accountId: string) {
    if (!useQuasarBackend()) return QfsSandboxService.getBalanceSnapshots(tenantId, accountId);
    try {
      const result = await (await quasarClient(tenantId)).getSandboxBalanceSnapshots(accountId);
      return result?.items ?? result?.snapshots ?? result ?? [];
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async getAuditLogs(tenantId: string, limit = 50, offset = 0) {
    if (!useQuasarBackend()) return QfsSandboxService.getAuditLogs(tenantId, limit, offset);
    try {
      const page = Math.floor(offset / Math.max(limit, 1)) + 1;
      const result = await (await quasarClient(tenantId)).getSandboxAuditLogs({ page, limit });
      return result?.items ?? result?.logs ?? result ?? [];
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async getTimeline(tenantId: string, limit = 50) {
    if (!useQuasarBackend()) return QfsSandboxService.getTimeline(tenantId, limit);
    try {
      const result = await (await quasarClient(tenantId)).getSandboxTimeline({ limit });
      return result?.items ?? result?.events ?? result ?? [];
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async getTimelineByCorrelation(tenantId: string, correlationId: string) {
    if (!useQuasarBackend()) {
      return QfsSandboxService.getTimelineByCorrelation(tenantId, correlationId);
    }
    try {
      return await (await quasarClient(tenantId)).getSandboxTimelineByCorrelation(correlationId);
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async createTransfer(tenantId: string, body: any) {
    if (!useQuasarBackend()) return QfsSandboxService.createTransfer(tenantId, body);
    try {
      const amount = body.amount ?? body.amountKobo;
      if (!amount) throw new Error('amount (kobo) is required');
      return await (await quasarClient(tenantId)).createSandboxTransfer(
        {
          virtualAccountId: body.virtualAccountId ?? body.fromAccountId,
          destinationVirtualAccountId: body.destinationVirtualAccountId ?? body.toAccountId,
          direction: body.direction ?? 'OUTGOING',
          amount: Number(amount),
          currency: body.currency || 'NGN',
          narration: body.narration,
          provider: body.provider || 'QUASAR_BANK',
          reference: body.reference,
          requiresApproval: body.requiresApproval ?? false,
        },
        { correlationId: body.correlationId },
      );
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async generateTransfer(tenantId: string, profileId: string) {
    if (!useQuasarBackend()) return QfsSandboxService.generateTransfer(tenantId, profileId);
    try {
      return await (await quasarClient(tenantId)).generateSandboxTransfer({ profileId });
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async listTransfers(tenantId: string, limit = 50, offset = 0) {
    if (!useQuasarBackend()) return QfsSandboxService.listTransfers(tenantId, limit, offset);
    try {
      const page = Math.floor(offset / Math.max(limit, 1)) + 1;
      const result = await (await quasarClient(tenantId)).listSandboxTransfers({ page, limit });
      return result?.items ?? result?.transfers ?? result ?? [];
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async getTransfer(tenantId: string, id: string) {
    if (!useQuasarBackend()) return QfsSandboxService.getTransfer(tenantId, id);
    try {
      return await (await quasarClient(tenantId)).getSandboxTransfer(id);
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async transitionTransfer(
    tenantId: string,
    id: string,
    action: 'approve' | 'reject' | 'reverse',
  ) {
    if (!useQuasarBackend()) return QfsSandboxService.transitionTransfer(tenantId, id, action);
    try {
      return await (await quasarClient(tenantId)).transitionSandboxTransfer(id, action);
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static async simulateProvider(tenantId: string, provider: string, body: any) {
    if (!useQuasarBackend()) return QfsSandboxService.simulateProvider(tenantId, provider, body);
    try {
      return await (await quasarClient(tenantId)).simulateSandboxProvider(provider, body);
    } catch (err) {
      rethrowQuasar(err);
    }
  }

  static getProfiles() {
    return TRANSACTION_PROFILES;
  }

  static getProvidersCatalog() {
    return PSP_PROVIDERS;
  }
}
