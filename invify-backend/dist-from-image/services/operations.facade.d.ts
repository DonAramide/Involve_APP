export declare class OperationsFacade {
    static createUser(tenantId: string, data: any): Promise<any>;
    static listUsers(tenantId: string): Promise<{
        id: string;
        email: string;
    }[]>;
    static updateSettingsGroup(tenantId: string, group: string, data: any): Promise<{
        group: string;
        data: any;
    }>;
    static listAuditLogs(tenantId: string): Promise<{
        id: string;
        topic: string;
    }[]>;
    static revokeApiKey(tenantId: string, keyId: string, reason: string): Promise<{
        keyId: string;
        revoked: boolean;
    }>;
}
