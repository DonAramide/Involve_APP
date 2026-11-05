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
import type { InvifyVertical } from '../integrations/quasar/quasar-platform.client';
import type { SandboxVirtualAccount } from '../integrations/quasar/quasar-payments.client';
/** Map Quasar camelCase VA → Invify legacy snake_case row shape. */
export declare function toInvifyAccountShape(va: SandboxVirtualAccount): {
    id: string;
    tenant_id: string;
    account_number: string;
    account_name: string;
    bank_code: string;
    bank_name: string;
    currency: string;
    balance_kobo: number;
    is_active: boolean;
    metadata: {
        serviceSlug: string | null;
        environment: string;
        source: string;
    };
    created_at: string;
    updated_at: string;
    tenantId: string;
    accountNumber: string;
    accountName: string;
    bankCode: string;
    bankName: string;
    availableBalance: string;
    status: string;
    serviceSlug: string | null;
    environment: string;
};
/**
 * Resolve Quasar Service Catalog slug for this Invify tenant.
 * Prefer quasar_integrations.quasar_vertical (invify_school|retail|services).
 * Falls back to QUASAR_DEFAULT_SERVICE_SLUG when using general QUASAR_API_KEY.
 */
export declare function resolveInvifyServiceSlug(invifyTenantId: string, override?: string | null): Promise<InvifyVertical>;
export declare class QfsQuasarBridgeService {
    static isQuasarMode(): boolean;
    static getSession(tenantId: string, keyId: string): Promise<{
        tenantId: string;
        tenantName: any;
        businessType: any;
        environment: string;
        keyId: string;
        accountCount: number;
    } | {
        tenantId: any;
        tenantName: any;
        environment: any;
        keyId: any;
        accountCount: number;
        backend: string;
        basePath: any;
        scopes: any;
    }>;
    static bootstrap(tenantId: string, webhookUrl: string, socketChannel?: string): Promise<any>;
    static getConfig(tenantId: string): Promise<any>;
    static updateConfig(tenantId: string, patch: {
        webhookUrl?: string;
        socketChannel?: string;
        chaosMode?: any;
    }): Promise<any>;
    static generateSecret(tenantId: string): Promise<any>;
    static getBanks(tenantId?: string): Promise<{
        code: string;
        name: string;
        shortName: string;
        nip: boolean;
    }[]>;
    /**
     * Providers + nested banks for preferred-bank pickers (before generate).
     */
    static listBankProviders(tenantId: string, q?: string): Promise<{
        defaultBankCode: string;
        defaultBankName: string;
        providers: {
            id: string;
            name: string;
            bankCount: number;
            banks: {
                code: string;
                name: string;
                slug: string;
                country: string;
                currency: string;
                active: boolean;
            }[];
        }[];
        banks: {
            code: string;
            name: string;
            slug: string;
            country: string;
            currency: string;
            active: boolean;
            providers: string[];
        }[];
        totalBanks: number;
        totalProviders: number;
        backend: "local";
    } | {
        backend: "quasar";
        defaultBankCode: string;
        defaultBankName: string;
        providers: Array<{
            id: string;
            name: string;
            bankCount: number;
            banks: Array<{
                code: string;
                name: string;
                slug: string;
                country: string;
                currency: string;
                active: boolean;
            }>;
        }>;
        banks: Array<{
            code: string;
            name: string;
            slug: string;
            country: string;
            currency: string;
            active: boolean;
            providers: string[];
        }>;
        totalBanks: number;
        totalProviders: number;
    }>;
    static lookupBanks(tenantId: string | undefined, q?: string, code?: string): Promise<{
        code: string;
        name: string;
        shortName: string;
        nip: boolean;
    }[]>;
    static generateAccounts(tenantId: string, accountName: string, count?: number, bankCode?: string, bankName?: string, serviceSlugOverride?: string | null): Promise<{
        accounts: ReturnType<typeof toInvifyAccountShape>[];
        quasarPayload: {
            serviceSlug: string;
            accountName: string;
            count: number;
            bankCode?: string;
            bankName?: string;
        } | null;
    }>;
    static listAccounts(tenantId: string): Promise<any[]>;
    static getAccount(tenantId: string, id: string): Promise<any>;
    static credit(tenantId: string, accountId: string, amountKobo: number, reason?: string, currency?: string, correlationId?: string): Promise<any>;
    static debit(tenantId: string, accountId: string, amountKobo: number, reason?: string, currency?: string, correlationId?: string): Promise<any>;
    static getLedger(tenantId: string, accountId: string, limit?: number, offset?: number, opts?: {
        noRetry?: boolean;
        timeoutMs?: number;
    }): Promise<any>;
    static getBalanceSnapshots(tenantId: string, accountId: string): Promise<any>;
    static getAuditLogs(tenantId: string, limit?: number, offset?: number): Promise<any>;
    static getTimeline(tenantId: string, limit?: number): Promise<any>;
    static getTimelineByCorrelation(tenantId: string, correlationId: string): Promise<any>;
    static createTransfer(tenantId: string, body: any): Promise<any>;
    static generateTransfer(tenantId: string, profileId: string): Promise<any>;
    static listTransfers(tenantId: string, limit?: number, offset?: number): Promise<any>;
    static getTransfer(tenantId: string, id: string): Promise<any>;
    static transitionTransfer(tenantId: string, id: string, action: 'approve' | 'reject' | 'reverse'): Promise<any>;
    static simulateProvider(tenantId: string, provider: string, body: any): Promise<any>;
    static getProfiles(): {
        id: string;
        label: string;
        amount: number;
        narration: string;
        provider: string;
    }[];
    static getProvidersCatalog(): {
        QUASAR: {
            name: string;
            signatureHeader: string;
            algorithm: string;
            webhookEvents: string[];
            delayMsMin: number;
            delayMsMax: number;
        };
        PAYSTACK: {
            name: string;
            signatureHeader: string;
            algorithm: string;
            webhookEvents: string[];
            delayMsMin: number;
            delayMsMax: number;
        };
        MONNIFY: {
            name: string;
            signatureHeader: string;
            algorithm: string;
            webhookEvents: string[];
            delayMsMin: number;
            delayMsMax: number;
        };
        FLUTTERWAVE: {
            name: string;
            signatureHeader: string;
            algorithm: string;
            webhookEvents: string[];
            delayMsMin: number;
            delayMsMax: number;
        };
        NIBSS: {
            name: string;
            signatureHeader: string;
            algorithm: string;
            webhookEvents: string[];
            delayMsMin: number;
            delayMsMax: number;
        };
    };
}
