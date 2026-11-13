export declare class TerminalSyncService {
    /**
     * Prefer one row when duplicates exist (maybeSingle fails on >1 with PGRST116).
     * When preferredTenantId is set, prefer that tenant's row over an arbitrary first row
     * (avoids false ACCESS_DENIED_OWNERSHIP_MISMATCH for reassigned tablets).
     */
    private static fetchOneByDeviceId;
    /**
     * Called by mobile device on startup / periodic sync.
     * Returns terminal config provisioned for the given deviceId.
     */
    static syncTerminalForDevice(deviceId: string, enrollmentKey?: string, serialNumber?: string, androidId?: string, tenantId?: string): Promise<{
        features: {
            invoicing: boolean;
            inventory: boolean;
            customerManagement: boolean;
            reporting: boolean;
            printing: boolean;
            emvPayments: boolean;
            cardSettlement: boolean;
        };
        supportPhone: string;
        supportEmail: string;
        supportWhatsapp: string;
        broadcastMessage: string;
        message: string;
        syncedAt: string;
        isEmergencyLocked: boolean;
        emergencyLockCode: any;
        tenantStatus: any;
        systemAccessPassword: any;
        assigned: boolean;
        deviceCategory: string;
        deviceRole: any;
        tenantId: any;
        tenantName: any;
        plan: any;
        type: any;
    } | {
        features: {
            invoicing: boolean;
            inventory: boolean;
            customerManagement: boolean;
            reporting: boolean;
            printing: boolean;
            emvPayments: boolean;
            cardSettlement: boolean;
        };
        terminalId: any;
        mposTerminalId: any;
        posSerialNumber: any;
        terminalType: any;
        configVersion: number;
        syncedAt: string;
        printerMac: any;
        printerModel: any;
        supportPhone: string;
        supportEmail: string;
        supportWhatsapp: string;
        broadcastMessage: string;
        message: string | null;
        activeHost: string;
        expressPayHost: any;
        expressPayPort: any;
        nibssIp: string | null;
        nibssPort: number | null;
        nibssSsl: boolean;
        primaryHost: any;
        secondaryHost: any;
        tertiaryHost: any;
        routingRules: {
            activeHost: "medusa" | "nibss" | "kimono" | "express_pay";
            failoverOrder: ("medusa" | "nibss" | "kimono" | "express_pay")[];
            splitThresholdNaira: number;
            processOnDevice: any;
            sendField120: boolean;
            webhookUrl: any;
            preferredHosts: any;
            fallbackHosts: any;
            amountThresholds: any;
            transactionTypeRules: any;
            scopeType: any;
            targetValue: any;
        };
        thresholdRules: import("../types/pos.types").ThresholdRule[];
        tenantPolicy: any;
        expressPayBaseUrl: any;
        expressPayAuthToken: any;
        merchantCode: any;
        terminalGroup: string | null;
        sslProfile: any;
        kimonoIp: any;
        kimonoPort: any;
        kimonoSSL: any;
        kimonoKeys: any;
        kimonoFallbackParameters: any;
        isEmergencyLocked: boolean;
        emergencyLockCode: any;
        tenantStatus: any;
        systemAccessPassword: any;
        assigned: boolean;
        success: boolean;
        deviceCategory: string;
        deviceRole: any;
        tenantId: any;
        tenantName: any;
        businessName: any;
        plan: any;
        type: any;
    }>;
    /**
     * Lightweight status check — no audit log entry.
     */
    static getTerminalStatus(deviceId: string): Promise<{
        assigned: boolean;
        deviceCategory: string;
        deviceRole: string;
        features: {
            invoicing: boolean;
            inventory: boolean;
            customerManagement: boolean;
            reporting: boolean;
            printing: boolean;
            emvPayments: boolean;
            cardSettlement: boolean;
        };
        terminalId?: undefined;
        mposTerminalId?: undefined;
        posSerialNumber?: undefined;
        terminalType?: undefined;
        configVersion?: undefined;
        activeHost?: undefined;
        expressPayHost?: undefined;
        expressPayPort?: undefined;
        nibssIp?: undefined;
        nibssPort?: undefined;
        nibssSsl?: undefined;
        primaryHost?: undefined;
        secondaryHost?: undefined;
        tertiaryHost?: undefined;
        expressPayBaseUrl?: undefined;
        expressPayAuthToken?: undefined;
        terminalGroup?: undefined;
        kimonoIp?: undefined;
        kimonoPort?: undefined;
        kimonoSSL?: undefined;
    } | {
        assigned: boolean;
        deviceCategory: string;
        deviceRole: string;
        features: {
            invoicing: boolean;
            inventory: boolean;
            customerManagement: boolean;
            reporting: boolean;
            printing: boolean;
            emvPayments: boolean;
            cardSettlement: boolean;
        };
        terminalId: any;
        mposTerminalId: any;
        posSerialNumber: any;
        terminalType: any;
        configVersion: number;
        activeHost: string;
        expressPayHost: any;
        expressPayPort: any;
        nibssIp: string | null;
        nibssPort: number | null;
        nibssSsl: boolean;
        primaryHost: any;
        secondaryHost: any;
        tertiaryHost: any;
        expressPayBaseUrl: any;
        expressPayAuthToken: any;
        terminalGroup: string | null;
        kimonoIp: any;
        kimonoPort: any;
        kimonoSSL: any;
    }>;
    static recordKeyExchangeSuccess(deviceId: string): Promise<{
        success: boolean;
    }>;
}
