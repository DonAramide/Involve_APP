export declare const DEVICE_LINK_TTL_MS: number;
export declare const WEB_ISSUER_DEVICE_ID = "WEB-PORTAL";
export declare function createDeviceLinkToken(now?: number): {
    token: string;
    expiresAt: Date;
};
export declare function buildDeviceLinkQrPayload(input: {
    token: string;
    tenantId: string;
    businessName: string;
    industry: string | null | undefined;
    expiresAt: Date | string;
}): string;
export declare function issueDeviceLinkQr(opts: {
    tenantId: string;
    issuerDeviceId?: string | null;
    agentCode?: string;
}): Promise<{
    ok: true;
    data: Record<string, unknown>;
} | {
    ok: false;
    status: number;
    error: string;
}>;
