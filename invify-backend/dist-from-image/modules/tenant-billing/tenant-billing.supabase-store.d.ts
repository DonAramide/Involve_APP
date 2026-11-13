import { MemoryTenantBillingStore } from './tenant-billing.service';
export declare class SupabaseTenantBillingStore extends MemoryTenantBillingStore {
    readonly persistent = true;
    hydrate(): Promise<void>;
    persistEntities(): Promise<void>;
    postPaymentAtomic(payload: Record<string, unknown>): Promise<{
        duplicate: boolean;
        payment: any;
    }>;
    reversePaymentAtomic(payload: Record<string, unknown>): Promise<{
        payment: any;
        reversal_id: string;
    }>;
}
