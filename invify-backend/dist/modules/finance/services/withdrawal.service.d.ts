export declare class WithdrawalService {
    processRejection(withdrawalId: string, adminId: string, reason: string): Promise<{
        status: string;
    }>;
    processClawback(commissionEventId: string, adminId: string, reason: string): Promise<{
        status: string;
        adjustment: any;
    }>;
}
export declare const withdrawalService: WithdrawalService;
