import { StructuredLogger } from '../observability/StructuredLogger';

export type IPListType = 'ALLOW' | 'DENY';

export interface IPListEntry {
  cidr: string;       // e.g. '192.168.1.0/24' or '10.0.0.1/32'
  listType: IPListType;
  tenantId: string | null; // null = global
  note: string;
  addedAt: string;
}

export interface IPCheckResult {
  ip: string;
  allowed: boolean;
  reason: string;
  matchedEntry: IPListEntry | null;
}

export class IPAllowListService {
  private static entries: IPListEntry[] = [];

  static clearEntries() {
    this.entries = [];
  }

  static getEntries(): IPListEntry[] {
    return this.entries;
  }

  /**
   * Add an IP (or CIDR range) to the allow or deny list.
   * /32 suffix is added automatically for single IPs.
   */
  static addEntry(
    cidr: string,
    listType: IPListType,
    tenantId: string | null = null,
    note = ''
  ) {
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
  static checkIP(ip: string, tenantId: string | null = null): IPCheckResult {
    const relevantEntries = this.entries.filter(
      (e) => e.tenantId === null || e.tenantId === tenantId
    );

    // Check DENY first (highest priority)
    for (const entry of relevantEntries.filter((e) => e.listType === 'DENY')) {
      if (this.ipMatchesCIDR(ip, entry.cidr)) {
        StructuredLogger.warn(`[IPAllowList] DENIED ${ip}`, { cidr: entry.cidr, note: entry.note });
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
  private static ipMatchesCIDR(ip: string, cidr: string): boolean {
    try {
      const [base, prefixStr] = cidr.split('/');
      const prefix = parseInt(prefixStr, 10);
      const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
      const ipInt = this.ipToInt(ip);
      const baseInt = this.ipToInt(base);
      return (ipInt & mask) === (baseInt & mask);
    } catch {
      return false;
    }
  }

  private static ipToInt(ip: string): number {
    return ip
      .split('.')
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }
}
