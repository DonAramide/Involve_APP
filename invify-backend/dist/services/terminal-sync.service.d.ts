export declare class TerminalSyncService {
    /**
     * Called by mobile device on startup / periodic sync.
     * Returns terminal config provisioned for the given deviceId.
     * Never returns { assigned: false } — all devices are valid.
     */
    static syncTerminalForDevice(deviceId: string, enrollmentKey?: string, serialNumber?: string, androidId?: string, tenantId?: string): Promise<{
        deviceCategory: string;
        deviceRole: any;
        tenantId: any;
        tenantName: any;
        plan: any;
        type: any;
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
        syncedAt: string;
        terminalId?: undefined;
        mposTerminalId?: undefined;
        posSerialNumber?: undefined;
        terminalType?: undefined;
        configVersion?: undefined;
        printerMac?: undefined;
        printerModel?: undefined;
        activeHost?: undefined;
        expressPayHost?: undefined;
        expressPayPort?: undefined;
        primaryHost?: undefined;
        secondaryHost?: undefined;
        tertiaryHost?: undefined;
        routingRules?: undefined;
        thresholdRules?: undefined;
        tenantPolicy?: undefined;
        expressPayBaseUrl?: undefined;
        expressPayAuthToken?: undefined;
        merchantCode?: undefined;
        terminalGroup?: undefined;
        sslProfile?: undefined;
        kimonoIp?: undefined;
        kimonoPort?: undefined;
        kimonoSSL?: undefined;
        kimonoKeys?: undefined;
        kimonoFallbackParameters?: undefined;
    } | {
        deviceCategory: string;
        deviceRole: any;
        tenantId: any;
        tenantName: any;
        plan: any;
        type: any;
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
        activeHost: string;
        expressPayHost: string | null;
        expressPayPort: number | null;
        primaryHost: import("../types/pos.types").PosHostConfig;
        secondaryHost: import("../types/pos.types").PosHostConfig;
        tertiaryHost: import("../types/pos.types").PosHostConfig;
        routingRules: {
            activeHost: "medusa" | "nibss" | "kimono" | "express_pay";
            failoverOrder: ("medusa" | "nibss" | "kimono" | "express_pay")[];
            splitThresholdNaira: number;
            processOnDevice: boolean;
            webhookUrl: string | null;
        };
        thresholdRules: import("../types/pos.types").ThresholdRule[];
        tenantPolicy: import("../types/pos.types").TenantRoutingProfile | null | undefined;
        expressPayBaseUrl: string | null;
        expressPayAuthToken: string | null;
        merchantCode: string | null;
        terminalGroup: string | null;
        sslProfile: string | null;
        kimonoIp: string | null;
        kimonoPort: number | null;
        kimonoSSL: boolean;
        kimonoKeys: {
            masterKey: string;
            pinKey: string;
        } | null;
        kimonoFallbackParameters: {
            merchantId: string;
            uniqueId: string;
            institutionId: string;
            settlementAccount: string;
            keyLabel: string;
            token: string;
        } | null;
    }>;
    /**
     * Lightweight status check — no audit log entry.
     * Returns device_category and features for all devices.
     */
    static getTerminalStatus(deviceId: string): Promise<{
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
        primaryHost?: undefined;
        secondaryHost?: undefined;
        tertiaryHost?: undefined;
        expressPayBaseUrl?: undefined;
        expressPayAuthToken?: undefined;
        kimonoIp?: undefined;
        kimonoPort?: undefined;
        kimonoSSL?: undefined;
    } | {
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
        expressPayHost: string | null;
        expressPayPort: number | null;
        primaryHost: import("../types/pos.types").PosHostConfig;
        secondaryHost: import("../types/pos.types").PosHostConfig;
        tertiaryHost: import("../types/pos.types").PosHostConfig;
        expressPayBaseUrl: string | null;
        expressPayAuthToken: string | null;
        kimonoIp: string | null;
        kimonoPort: number | null;
        kimonoSSL: boolean;
    }>;
    static recordKeyExchangeSuccess(deviceId: string): Promise<{
        success: boolean;
    }>;
}
