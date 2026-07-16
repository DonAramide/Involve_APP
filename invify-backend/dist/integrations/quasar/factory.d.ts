import { QuasarService } from "./quasar.service";
/**
 * Factory function to retrieve a correctly initialized QuasarService.
 * RULE: Platform-level credentials only. NEVER use per-tenant API keys.
 * Production model: single platform Quasar account (QUASER_API_KEY env var).
 * tenantId parameter retained for signature compatibility.
 */
export declare const getQuasarService: (tenantId: string) => Promise<QuasarService>;
