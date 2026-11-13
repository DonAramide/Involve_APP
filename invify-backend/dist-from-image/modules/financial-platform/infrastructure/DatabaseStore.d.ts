export declare class DatabaseStore {
    getActiveTenants(): Promise<{
        id: any;
        name: any;
    }[]>;
    getSucceededPayments(tenantId: string, targetDate: string): Promise<any[]>;
    createReconciliationRecord(payload: any): Promise<any>;
    updateReconciliationRecord(recordId: string, payload: any): Promise<any>;
}
