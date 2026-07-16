"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoBlockingService = void 0;
const StructuredLogger_1 = require("../observability/StructuredLogger");
class GeoBlockingService {
    /** ISO 3166-1 alpha-2 country codes explicitly blocked */
    static blockedCountries = new Set();
    /** ISO 3166-1 alpha-2 country codes explicitly allowed (used in DENY_ALL stance) */
    static allowedCountries = new Set();
    /**
     * Default stance when no specific rule matches.
     * ALLOW_ALL: permit unless explicitly blocked.
     * DENY_ALL:  deny unless explicitly allowed.
     */
    static stance = 'ALLOW_ALL';
    /** Active bypass keys allowing pentest/ops to override geo rules. */
    static bypassKeys = new Set();
    static clearState() {
        this.blockedCountries.clear();
        this.allowedCountries.clear();
        this.bypassKeys.clear();
        this.stance = 'ALLOW_ALL';
    }
    static setStance(stance) {
        this.stance = stance;
    }
    static getStance() {
        return this.stance;
    }
    static blockCountry(countryCode) {
        this.blockedCountries.add(countryCode.toUpperCase());
    }
    static allowCountry(countryCode) {
        this.allowedCountries.add(countryCode.toUpperCase());
    }
    static getBlockedCountries() {
        return Array.from(this.blockedCountries);
    }
    static getAllowedCountries() {
        return Array.from(this.allowedCountries);
    }
    /** Register a bypass key (e.g. for pentest or ops emergency access). */
    static registerBypassKey(key) {
        this.bypassKeys.add(key);
    }
    static revokeBypassKey(key) {
        this.bypassKeys.delete(key);
    }
    /**
     * Evaluates whether traffic from countryCode is allowed.
     * @param countryCode ISO 3166-1 alpha-2 code, e.g. 'NG', 'US', 'RU'
     * @param bypassKey   Optional ops/pentest bypass token
     */
    static checkCountry(countryCode, bypassKey) {
        const code = countryCode.toUpperCase();
        // Bypass key overrides all geo rules
        if (bypassKey && this.bypassKeys.has(bypassKey)) {
            return { countryCode: code, allowed: true, reason: 'Geo bypass key accepted' };
        }
        // Explicit block list takes priority in both stances
        if (this.blockedCountries.has(code)) {
            StructuredLogger_1.StructuredLogger.warn(`[GeoBlocking] DENIED country=${code}`);
            return { countryCode: code, allowed: false, reason: `Country ${code} is explicitly blocked` };
        }
        if (this.stance === 'DENY_ALL') {
            if (this.allowedCountries.has(code)) {
                return { countryCode: code, allowed: true, reason: `Country ${code} is in the allow list` };
            }
            StructuredLogger_1.StructuredLogger.warn(`[GeoBlocking] DENIED (DENY_ALL stance) country=${code}`);
            return { countryCode: code, allowed: false, reason: `Country ${code} not in allow list (DENY_ALL stance)` };
        }
        // ALLOW_ALL stance — permit unless explicitly blocked
        return { countryCode: code, allowed: true, reason: `Country ${code} permitted (ALLOW_ALL stance)` };
    }
}
exports.GeoBlockingService = GeoBlockingService;
//# sourceMappingURL=GeoBlockingService.js.map