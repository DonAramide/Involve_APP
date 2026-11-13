"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPAllowListService = void 0;
const StructuredLogger_1 = require("../observability/StructuredLogger");
class IPAllowListService {
    static entries = [];
    static clearEntries() {
        this.entries = [];
    }
    static getEntries() {
        return this.entries;
    }
    /**
     * Add an IP (or CIDR range) to the allow or deny list.
     * /32 suffix is added automatically for single IPs.
     */
    static addEntry(cidr, listType, tenantId = null, note = '') {
        const normalised = cidr.includes('/') ? cidr : `${cidr}/32`;
        this.entries.push({
            cidr: normalised,
            listType,
            tenantId,
            note,
            addedAt: new Date().toISOString(),
        });
    }
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
    static checkIP(ip, tenantId = null) {
        const relevantEntries = this.entries.filter((e) => e.tenantId === null || e.tenantId === tenantId);
        // Check DENY first (highest priority)
        for (const entry of relevantEntries.filter((e) => e.listType === 'DENY')) {
            if (this.ipMatchesCIDR(ip, entry.cidr)) {
                StructuredLogger_1.StructuredLogger.warn(`[IPAllowList] DENIED ${ip}`, { cidr: entry.cidr, note: entry.note });
                return { ip, allowed: false, reason: `IP denied by rule: ${entry.cidr} (${entry.note})`, matchedEntry: entry };
            }
        }
        // Check explicit ALLOW entries
        for (const entry of relevantEntries.filter((e) => e.listType === 'ALLOW')) {
            if (this.ipMatchesCIDR(ip, entry.cidr)) {
                return { ip, allowed: true, reason: `IP permitted by rule: ${entry.cidr}`, matchedEntry: entry };
            }
        }
        // No match — default allow (deny-list-only model; change to false for allowlist-only)
        return { ip, allowed: true, reason: 'No matching rule — default allow', matchedEntry: null };
    }
    /**
     * Naive IPv4 CIDR matching (sufficient for testing and ops use).
     * Converts both the IP and the CIDR base to 32-bit integers for comparison.
     */
    static ipMatchesCIDR(ip, cidr) {
        try {
            const [base, prefixStr] = cidr.split('/');
            const prefix = parseInt(prefixStr, 10);
            const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
            const ipInt = this.ipToInt(ip);
            const baseInt = this.ipToInt(base);
            return (ipInt & mask) === (baseInt & mask);
        }
        catch {
            return false;
        }
    }
    static ipToInt(ip) {
        return ip
            .split('.')
            .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    }
}
exports.IPAllowListService = IPAllowListService;
//# sourceMappingURL=IPAllowListService.js.map