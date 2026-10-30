import { QuasarService } from "./quasar.service";
export type GetQuasarServiceOptions = {
    /**
     * Tenant operating VA only: quasar_integrations row, no env/vault/demo-key fallback.
     */
    tenantIntegrationOnly?: boolean;
};
/**
 * Factory function to retrieve a correctly initialized QuasarService.
 * Prefer live tenant keys for production financial / POS APIs.
 */
export declare const getQuasarService: (tenantId: string, options?: GetQuasarServiceOptions) => Promise<QuasarService>;
