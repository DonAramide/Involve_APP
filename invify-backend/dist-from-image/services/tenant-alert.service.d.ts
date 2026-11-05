export type TenantAlertKind = 'transaction' | 'withdrawal' | 'lowbalance' | 'newlogin' | 'passwordchange' | 'newstaff' | 'stocklow' | 'report';
export type TenantNotificationPrefs = Record<string, boolean | string> & {
    digestFrequency?: string;
};
export declare class TenantAlertService {
    static defaultPrefs(): TenantNotificationPrefs;
    static getPrefs(tenantId: string): Promise<TenantNotificationPrefs>;
    static savePrefs(tenantId: string, prefs: TenantNotificationPrefs): Promise<TenantNotificationPrefs>;
    static recipients(tenantId: string): Promise<Array<{
        email: string;
        name: string;
        userId?: string;
    }>>;
    static notify(tenantId: string, kind: TenantAlertKind, opts: {
        title: string;
        body: string;
        amount?: number;
    }): Promise<void>;
    static notifyTransaction(tenantId: string, payload: {
        invoiceNumber?: string;
        amount?: number;
        customerName?: string;
        count?: number;
    }): void;
    static notifyWithdrawal(tenantId: string, payload: {
        amount: number;
        reference?: string;
    }): void;
    static checkLowBalance(tenantId: string): Promise<void>;
    static wantsLoginEmail(prefs: TenantNotificationPrefs): boolean;
}
