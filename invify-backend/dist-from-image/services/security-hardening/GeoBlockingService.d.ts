export type GeoStance = 'ALLOW_ALL' | 'DENY_ALL';
export interface GeoCheckResult {
    countryCode: string;
    allowed: boolean;
    reason: string;
}
export declare class GeoBlockingService {
    /** ISO 3166-1 alpha-2 country codes explicitly blocked */
    private static blockedCountries;
    /** ISO 3166-1 alpha-2 country codes explicitly allowed (used in DENY_ALL stance) */
    private static allowedCountries;
    /**
     * Default stance when no specific rule matches.
     * ALLOW_ALL: permit unless explicitly blocked.
     * DENY_ALL:  deny unless explicitly allowed.
     */
    private static stance;
    /** Active bypass keys allowing pentest/ops to override geo rules. */
    private static bypassKeys;
    static clearState(): void;
    static setStance(stance: GeoStance): void;
    static getStance(): GeoStance;
    static blockCountry(countryCode: string): void;
    static allowCountry(countryCode: string): void;
    static getBlockedCountries(): string[];
    static getAllowedCountries(): string[];
    /** Register a bypass key (e.g. for pentest or ops emergency access). */
    static registerBypassKey(key: string): void;
    static revokeBypassKey(key: string): void;
    /**
     * Evaluates whether traffic from countryCode is allowed.
     * @param countryCode ISO 3166-1 alpha-2 code, e.g. 'NG', 'US', 'RU'
     * @param bypassKey   Optional ops/pentest bypass token
     */
    static checkCountry(countryCode: string, bypassKey?: string): GeoCheckResult;
}
