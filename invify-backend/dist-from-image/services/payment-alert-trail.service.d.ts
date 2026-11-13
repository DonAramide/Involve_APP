export type PaymentAlertInput = {
    tenantId: string;
    reference: string;
    amount: number;
    payload?: Record<string, any>;
};
/** Keep resending every 6 seconds until the tablet acknowledges receipt. */
export declare function nextPaymentAlertDelayMs(_attempts: number): number;
export declare function tenantSocketCount(io: any, tenantId: string): number;
export declare class PaymentAlertTrailService {
    static recordAndEmit(io: any, input: PaymentAlertInput): Promise<void>;
    static emit(io: any, row: any): void;
    static markAttempt(io: any, row: any): Promise<void>;
    static acknowledge(tenantId: string, reference: string, deviceId?: string | null): Promise<boolean>;
    static flushTenant(io: any, tenantId: string): Promise<number>;
    static retryDue(io: any): Promise<number>;
    static listForTenant(tenantId: string): Promise<{
        id: any;
        reference: any;
        amount: any;
        status: any;
        attempts: any;
        created_at: any;
        delivered_at: any;
        last_attempt_at: any;
    }[]>;
}
