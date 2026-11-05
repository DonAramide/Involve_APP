export declare const SANDBOX_BANKS: {
    code: string;
    name: string;
    shortName: string;
    nip: boolean;
}[];
export declare const PSP_PROVIDERS: {
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
export declare const TRANSACTION_PROFILES: {
    id: string;
    label: string;
    amount: number;
    narration: string;
    provider: string;
}[];
export declare class QfsSandboxService {
    static getSession(tenantId: string, keyId: string): Promise<{
        tenantId: string;
        tenantName: any;
        businessType: any;
        environment: string;
        keyId: string;
        accountCount: number;
    }>;
    static bootstrap(tenantId: string, webhookUrl: string, socketChannel?: string): Promise<{
        webhookUrl: string;
        socketChannel: string | null;
        sandboxSecretKey: string;
        note: string;
    }>;
    static getConfig(tenantId: string): Promise<{
        configured: boolean;
        webhookUrl?: undefined;
        socketChannel?: undefined;
        secretConfigured?: undefined;
        chaosMode?: undefined;
        updatedAt?: undefined;
    } | {
        configured: boolean;
        webhookUrl: any;
        socketChannel: any;
        secretConfigured: boolean;
        chaosMode: any;
        updatedAt: any;
    }>;
    static updateConfig(tenantId: string, patch: {
        webhookUrl?: string;
        socketChannel?: string;
        chaosMode?: any;
    }): Promise<{
        updated: boolean;
    }>;
    static generateSecret(tenantId: string): Promise<{
        sandboxSecretKey: string;
        note: string;
    }>;
    static getBanks(): {
        code: string;
        name: string;
        shortName: string;
        nip: boolean;
    }[];
    static lookupBanks(q?: string, code?: string): {
        code: string;
        name: string;
        shortName: string;
        nip: boolean;
    }[];
    static generateAccounts(tenantId: string, accountName: string, count?: number, bankCode?: string, bankName?: string): Promise<any[]>;
    static listAccounts(tenantId: string): Promise<any[]>;
    static getAccount(tenantId: string, id: string): Promise<any>;
    static credit(tenantId: string, accountId: string, amountKobo: number, reason?: string, currency?: string, correlationId?: string): Promise<{
        accountId: string;
        reference: string;
        amountKobo: number;
        balanceAfterKobo: any;
        ledgerEntryId: any;
    }>;
    static debit(tenantId: string, accountId: string, amountKobo: number, reason?: string, currency?: string, correlationId?: string): Promise<{
        accountId: string;
        reference: string;
        amountKobo: number;
        balanceAfterKobo: number;
    }>;
    static getLedger(tenantId: string, accountId: string, limit?: number, offset?: number): Promise<any[]>;
    static getBalanceSnapshots(tenantId: string, accountId: string, limit?: number): Promise<any[]>;
    static createTransfer(tenantId: string, body: any): Promise<any>;
    static generateTransfer(tenantId: string, profileId: string): Promise<any>;
    static listTransfers(tenantId: string, limit?: number, offset?: number): Promise<any[]>;
    static getTransfer(tenantId: string, id: string): Promise<any>;
    static transitionTransfer(tenantId: string, id: string, action: 'approve' | 'reject' | 'reverse'): Promise<any>;
    static getTimeline(tenantId: string, limit?: number): Promise<any[]>;
    static getTimelineByCorrelation(tenantId: string, correlationId: string): Promise<{
        correlationId: string;
        ledgerEntries: any[];
        transfers: any[];
    }>;
    static simulateProvider(tenantId: string, provider: string, body: any): Promise<{
        provider: string;
        signatureHeader: string;
        signature: string;
        algorithm: string;
        payload: any;
        curlExample: string;
    }>;
    static getAuditLogs(tenantId: string, limit?: number, offset?: number): Promise<any[]>;
}
