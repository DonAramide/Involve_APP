export type EmailDeviceResolution = {
    exists: boolean;
    sameDevice: boolean;
    tenantId: string | null;
    userId: string | null;
    registeredDevices: string[];
};
export type DeviceRegistrationRow = {
    id?: string | null;
    device_id?: string | null;
    device_number?: number | null;
    tenant_id?: string | null;
    owner_email?: string | null;
};
export declare function normalizeDeviceId(id?: string | null): string;
export declare function isPlaceholderDeviceId(id?: string | null): boolean;
export declare function isUsableDeviceId(id?: string | null): boolean;
export declare function displayableDeviceId(id?: string | null): string | null;
export declare function findPlaceholderRegistration(rows: Array<DeviceRegistrationRow | null | undefined>): DeviceRegistrationRow | null;
export declare function deviceIdsMatch(left?: string | null, right?: string | null): boolean;
export declare function emptyEmailDeviceResolution(): EmailDeviceResolution;
export declare function uniqueDeviceIds(rows: Array<{
    device_id?: string | null;
} | null | undefined>): string[];
