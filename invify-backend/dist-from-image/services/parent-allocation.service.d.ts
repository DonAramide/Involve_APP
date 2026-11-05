import { PoolClient } from 'pg';
/**
 * New parent deposits only. Historical USER_WALLET rows are not scanned or rewritten.
 * One invoice identity posts at most one school credit.
 */
export declare class ParentAllocationService {
    static creditSchoolOnce(params: {
        tenantId: string;
        invoiceNumber?: string | null;
        reference?: string | null;
        paymentMethod?: string | null;
        amountNaira: number;
        historicalBackfill?: boolean;
        businessMode?: string | null;
        studentId?: string | number | null;
        pgClient?: PoolClient;
    }): Promise<{
        status: 'CREATED' | 'SKIPPED' | 'DE-DUPLICATED';
        reason?: string;
    }>;
}
