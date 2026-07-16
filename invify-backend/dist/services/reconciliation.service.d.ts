export declare class ReconciliationService {
    static getReport(params: {
        tenantId: string;
        status?: string;
        cursor?: string;
        limit?: number;
    }): Promise<{
        summary: {
            totalPayments: number;
            matched: number;
            unmatched: number;
            issues: number;
            mismatchAmount: number;
            reconciliationRate: number;
        };
        data: {
            id: any;
            txnId: any;
            ledgerBatchId: any;
            expectedAmount: any;
            actualAmount: any;
            difference: any;
            status: any;
            riskScore: any;
            createdDate: any;
        }[];
        pagination: {
            total: number;
            limit: number;
            nextCursor: string | null;
        };
    }>;
    static getDetails(caseNumber: string, tenantId: string): Promise<{
        status: string;
        data: any;
    }>;
    static getLedger(caseNumber: string, tenantId: string): Promise<{
        status: string;
        message: string;
        data?: undefined;
    } | {
        status: string;
        data: any[];
        message?: undefined;
    }>;
    static getSettlement(caseNumber: string, tenantId: string): Promise<{
        status: string;
        message: string;
        data?: undefined;
    } | {
        status: string;
        data: {
            batchId: any;
        };
        message?: undefined;
    }>;
    static getWallet(caseNumber: string, tenantId: string): Promise<{
        status: string;
        message: string;
    }>;
    static getCard(caseNumber: string, tenantId: string): Promise<{
        status: string;
        message: string;
    }>;
    static getBank(caseNumber: string, tenantId: string): Promise<{
        status: string;
        message: string;
    }>;
    static getAudit(caseNumber: string, tenantId: string): Promise<{
        status: string;
        data: any[];
    }>;
    static getTimeline(caseNumber: string, tenantId: string): Promise<{
        status: string;
        message: string;
        data?: undefined;
    } | {
        status: string;
        data: any[];
        message?: undefined;
    }>;
    static executeCommand(caseNumber: string, command: string, payload: any, user: any, tenantId: string): Promise<{
        success: boolean;
        caseNumber: string;
        newStatus: any;
        correlationId: `${string}-${string}-${string}-${string}-${string}`;
    }>;
}
