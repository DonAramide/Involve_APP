export type ClaimUnassignedResult = {
    bound: boolean;
    overrodeUnassigned: boolean;
    deviceNumber: number;
};
/**
 * If a web-created tenant has no real hardware serial (null / UNASSIGNED /
 * WEB-PORTAL), bind the incoming tablet serial onto that slot.
 * Does not steal a tenant that already has a different usable device.
 */
export declare function claimUnassignedDeviceForTenant(opts: {
    tenantId: string;
    deviceId: string;
    ownerEmail?: string | null;
    ownerName?: string | null;
    agentCode?: string | null;
    location?: string | null;
}): Promise<ClaimUnassignedResult>;
