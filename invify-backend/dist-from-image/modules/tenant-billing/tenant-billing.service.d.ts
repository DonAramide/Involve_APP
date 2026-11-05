import { InstallmentStatus, ObligationType, PaymentMethod } from './tenant-billing.engine';
export type Actor = {
    id: string;
    email: string;
    role: string;
    ip?: string;
};
export type BillingAccount = {
    id: string;
    tenantId: string;
    currency: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
    unappliedCreditKobo: number;
    createdAt: string;
    updatedAt: string;
};
export type BillingObligation = {
    id: string;
    tenantId: string;
    billingAccountId: string;
    type: ObligationType;
    description: string;
    currency: string;
    grossAmountKobo: number;
    amountPaidKobo: number;
    amountOutstandingKobo: number;
    status: 'OPEN' | 'PARTIAL' | 'PAID' | 'CANCELLED';
    issueDate: string;
    dueDate: string;
    startDate?: string | null;
    endDate?: string | null;
    source: string;
    deviceId?: string | null;
    subscriptionId?: string | null;
    metadata: Record<string, unknown>;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
};
export type BillingInstallment = {
    id: string;
    tenantId: string;
    obligationId: string;
    planId: string;
    sequence: number;
    dueDate: string;
    amountKobo: number;
    paidKobo: number;
    outstandingKobo: number;
    status: InstallmentStatus;
    cancelled: boolean;
    waived: boolean;
};
export type BillingPayment = {
    id: string;
    tenantId: string;
    billingAccountId: string;
    amountKobo: number;
    allocatedKobo: number;
    unappliedKobo: number;
    method: PaymentMethod;
    reference: string;
    idempotencyKey: string;
    paymentDate: string;
    notes?: string;
    status: string;
    verification: string | null;
    postedBy: string;
    postedByRole: string;
    createdAt: string;
    reversalId?: string | null;
};
type AuditRow = {
    id: string;
    actorId: string;
    actorRole: string;
    action: string;
    tenantId: string;
    billingAccountId?: string;
    obligationId?: string;
    paymentId?: string;
    amountKobo?: number;
    previousState?: unknown;
    newState?: unknown;
    timestamp: string;
    reference?: string;
    reason?: string;
    ip?: string;
};
export declare class MemoryTenantBillingStore {
    readonly persistent: boolean;
    accounts: Map<string, BillingAccount>;
    obligations: Map<string, BillingObligation>;
    plans: Map<string, any>;
    installments: Map<string, BillingInstallment>;
    payments: Map<string, BillingPayment>;
    allocations: any[];
    reversals: any[];
    subscriptions: Map<string, any>;
    audit: AuditRow[];
    events: any[];
    private chains;
    hydrate(): Promise<void>;
    persistEntities(): Promise<void>;
    withAccountLock<T>(accountId: string, fn: () => Promise<T>): Promise<T>;
}
export declare class TenantBillingService {
    store: MemoryTenantBillingStore;
    constructor(store: MemoryTenantBillingStore);
    ensureAccount(tenantId: string, currency?: string): BillingAccount;
    createObligation(input: {
        tenantId: string;
        type: ObligationType;
        description: string;
        grossAmountKobo: number;
        dueDate: string;
        issueDate?: string;
        deviceId?: string | null;
        subscriptionId?: string | null;
        source?: string;
        actor: Actor;
    }): BillingObligation;
    createDeviceInstallmentPlan(input: {
        tenantId: string;
        deviceId: string;
        description: string;
        purchasePriceKobo: number;
        downPaymentKobo: number;
        installmentKobo: number;
        firstDueDate: string;
        serialNumber?: string;
        actor: Actor;
        now?: string | Date;
    }): {
        obligation: BillingObligation;
        planId: `${string}-${string}-${string}-${string}-${string}`;
        installments: BillingInstallment[];
    };
    createSubscription(input: {
        tenantId: string;
        planName: string;
        amountKobo: number;
        frequency?: 'MONTHLY';
        nextDue: string;
        actor: Actor;
    }): {
        subscription: {
            id: `${string}-${string}-${string}-${string}-${string}`;
            tenantId: string;
            billingAccountId: string;
            planName: string;
            amountKobo: number;
            frequency: "MONTHLY";
            nextDue: string;
            status: string;
        };
        obligation: BillingObligation;
    };
    private refreshObligation;
    private refreshInstallment;
    previewPayment(input: {
        tenantId: string;
        obligationId?: string;
        installmentId?: string;
        amountKobo: number;
        now?: string | Date;
        allowFutureWhileOverdue?: boolean;
    }): {
        proposedAllocations: {
            installmentId: string;
            amountKobo: number;
        }[];
        proposedObligationAllocations: {
            obligationId: string;
            amountKobo: number;
        }[];
        unappliedCreditKobo: number;
        outstandingBeforeKobo: number;
        paymentKobo: number;
        amountAppliedKobo: number;
        outstandingAfterKobo: number;
        overpaymentPolicy: "UNAPPLIED_CREDIT";
        accountId: string;
    };
    postPayment(input: {
        tenantId: string;
        amountKobo: number;
        method: PaymentMethod;
        reference: string;
        paymentDate: string;
        notes?: string;
        obligationId?: string;
        installmentId?: string;
        idempotencyKey?: string;
        allocations?: {
            installmentId: string;
            amountKobo: number;
        }[];
        confirm?: boolean;
        actor: Actor;
        now?: string | Date;
        allowFutureWhileOverdue?: boolean;
    }): Promise<{
        payment: BillingPayment;
        preview: ReturnType<TenantBillingService['previewPayment']>;
        duplicate?: boolean;
    }>;
    confirmPayment(input: {
        paymentId: string;
        tenantId: string;
        allocations: {
            installmentId: string;
            amountKobo: number;
        }[];
        obligationAllocations?: {
            obligationId: string;
            amountKobo: number;
        }[];
        actor: Actor;
        now?: string | Date;
    }): BillingPayment;
    reversePayment(input: {
        paymentId: string;
        tenantId: string;
        reason: string;
        actor: Actor;
        now?: string | Date;
    }): {
        payment: BillingPayment;
        reversalId: `${string}-${string}-${string}-${string}-${string}`;
    };
    reversePaymentRemote(input: {
        paymentId: string;
        tenantId: string;
        reason: string;
        actor: Actor;
    }): Promise<{
        payment: BillingPayment;
        reversalId: string;
    }>;
    cancelObligation(obligationId: string, tenantId: string, actor: Actor): BillingObligation;
    overview(now?: string | Date): {
        totalOutstandingKobo: number;
        dueThisMonthKobo: number;
        overdueKobo: number;
        collectedThisMonthKobo: number;
        pendingPayments: number;
        activeInstallmentPlans: number;
        activeSubscriptions: number;
    };
    tenantProfile(tenantId: string, now?: string | Date): {
        tenantId: string;
        totalObligationsKobo: number;
        totalPaidKobo: number;
        outstandingKobo: number;
        overdueKobo: number;
        devices: BillingObligation[];
        subscriptions: any[];
        payments: BillingPayment[];
        installments: BillingInstallment[];
    };
    reports(kind: string, filters?: {
        tenantId?: string;
    }): any[];
    private lumpObligations;
    private installmentsForScope;
    assertCanCreateDevicePlan(tenantId: string): void;
    private assertTenant;
    private audit;
    private emit;
}
export {};
