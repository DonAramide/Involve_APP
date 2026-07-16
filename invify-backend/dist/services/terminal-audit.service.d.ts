export declare class TerminalAuditService {
    static log(entry: {
        actionType: string;
        terminalId?: string;
        mposTerminalId?: string;
        oldDeviceId?: string | null;
        newDeviceId?: string | null;
        adminId: string;
        reason?: string;
        ipAddress?: string;
        metadata?: any;
    }): Promise<any>;
    static getAuditLog(filters?: any): Promise<{
        data: any[];
        total: number;
    }>;
}
