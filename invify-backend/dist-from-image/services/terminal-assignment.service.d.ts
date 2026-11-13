export declare class TerminalAssignmentService {
    static assign(params: {
        terminalId: string;
        hardwareId?: string;
        deviceId: string;
        tenantId?: string;
        adminId: string;
        reason?: string;
        ipAddress?: string;
    }): Promise<any>;
    static unassign(params: {
        terminalId: string;
        adminId: string;
        reason: string;
        ipAddress?: string;
    }): Promise<any>;
    static transfer(params: {
        terminalId: string;
        newDeviceId: string;
        newTenantId?: string;
        adminId: string;
        reason: string;
        ipAddress?: string;
    }): Promise<any>;
    static suspend(params: {
        terminalId: string;
        adminId: string;
        reason: string;
        ipAddress?: string;
    }): Promise<any>;
}
