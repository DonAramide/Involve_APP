export declare class CommissionService {
    processActivation(tenantActivationLogId: string, agentId: string): Promise<{
        status: string;
        event?: undefined;
    } | {
        status: string;
        event: any;
    }>;
}
export declare const commissionService: CommissionService;
