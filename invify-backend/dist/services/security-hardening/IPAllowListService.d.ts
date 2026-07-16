export type IPListType = 'ALLOW' | 'DENY';
export interface IPListEntry {
    cidr: string;
    listType: IPListType;
    tenantId: string | null;
    note: string;
    addedAt: string;
}
export interface IPCheckResult {
    ip: string;
    allowed: boolean;
    reason: string;
    matchedEntry: IPListEntry | null;
}
export declare class IPAllowListService {
    private static entries;
    static clearEntries(): void;
    static getEntries(): IPListEntry[];
    /**
     * Add an IP (or CIDR range) to the allow or deny list.
     * /32 suffix is added automatically for single IPs.
     */
    static addEntry(cidr: string, listType: IPListType, tenantId?: string | null, note?: string): void;
    /**
     * Check whether an IP is allowed for the given tenantId (or globally).
     *
     * Priority order:
     *  1. Tenant-scoped DENY  → always block
     *  2. Global DENY         → block
     *  3. Tenant-scoped ALLOW → allow
     *  4. Global ALLOW        → allow
     *  5. No match            → allow by default (allowlist model opt-in only)
     */
    static checkIP(ip: string, tenantId?: string | null): IPCheckResult;
    /**
     * Naive IPv4 CIDR matching (sufficient for testing and ops use).
     * Converts both the IP and the CIDR base to 32-bit integers for comparison.
     */
    private static ipMatchesCIDR;
    private static ipToInt;
}
