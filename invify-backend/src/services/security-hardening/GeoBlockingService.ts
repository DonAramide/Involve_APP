import { StructuredLogger } from '../observability/StructuredLogger';

export type GeoStance = 'ALLOW_ALL' | 'DENY_ALL';

export interface GeoCheckResult {
  countryCode: string;
  allowed: boolean;
  reason: string;
}

export class GeoBlockingService {
  /** ISO 3166-1 alpha-2 country codes explicitly blocked */
  private static blockedCountries: Set<string> = new Set();
  /** ISO 3166-1 alpha-2 country codes explicitly allowed (used in DENY_ALL stance) */
  private static allowedCountries: Set<string> = new Set();

  /**
   * Default stance when no specific rule matches.
   * ALLOW_ALL: permit unless explicitly blocked.
   * DENY_ALL:  deny unless explicitly allowed.
   */
  private static stance: GeoStance = 'ALLOW_ALL';

  /** Active bypass keys allowing pentest/ops to override geo rules. */
  private static bypassKeys: Set<string> = new Set();

  static clearState() {
    this.blockedCountries.clear();
    this.allowedCountries.clear();
    this.bypassKeys.clear();
    this.stance = 'ALLOW_ALL';
  }

  static setStance(stance: GeoStance) {
    this.stance = stance;
  }

  static getStance(): GeoStance {
    return this.stance;
  }

  static blockCountry(countryCode: string) {
    this.blockedCountries.add(countryCode.toUpperCase());
  }

  static allowCountry(countryCode: string) {
    this.allowedCountries.add(countryCode.toUpperCase());
  }

  static getBlockedCountries(): string[] {
    return Array.from(this.blockedCountries);
  }

  static getAllowedCountries(): string[] {
    return Array.from(this.allowedCountries);
  }

  /** Register a bypass key (e.g. for pentest or ops emergency access). */
  static registerBypassKey(key: string) {
    this.bypassKeys.add(key);
  }

  static revokeBypassKey(key: string) {
    this.bypassKeys.delete(key);
  }

  /**
   * Evaluates whether traffic from countryCode is allowed.
   * @param countryCode ISO 3166-1 alpha-2 code, e.g. 'NG', 'US', 'RU'
   * @param bypassKey   Optional ops/pentest bypass token
   */
  static checkCountry(countryCode: string, bypassKey?: string): GeoCheckResult {
    const code = countryCode.toUpperCase();

    // Bypass key overrides all geo rules
    if (bypassKey && this.bypassKeys.has(bypassKey)) {
      return { countryCode: code, allowed: true, reason: 'Geo bypass key accepted' };
    }

    // Explicit block list takes priority in both stances
    if (this.blockedCountries.has(code)) {
      StructuredLogger.warn(`[GeoBlocking] DENIED country=${code}`);
      return { countryCode: code, allowed: false, reason: `Country ${code} is explicitly blocked` };
    }

    if (this.stance === 'DENY_ALL') {
      if (this.allowedCountries.has(code)) {
        return { countryCode: code, allowed: true, reason: `Country ${code} is in the allow list` };
      }
      StructuredLogger.warn(`[GeoBlocking] DENIED (DENY_ALL stance) country=${code}`);
      return { countryCode: code, allowed: false, reason: `Country ${code} not in allow list (DENY_ALL stance)` };
    }

    // ALLOW_ALL stance — permit unless explicitly blocked
    return { countryCode: code, allowed: true, reason: `Country ${code} permitted (ALLOW_ALL stance)` };
  }
}
