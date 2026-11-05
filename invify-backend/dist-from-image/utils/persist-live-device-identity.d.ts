export declare function persistLiveDeviceIdentity(opts: {
    tenantId: string;
    deviceId?: string | null;
    location?: string | null;
}): Promise<{
    claimed: boolean;
    locationUpdated: boolean;
    deviceId: string | null;
}>;
