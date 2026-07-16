import { FeeConfiguration } from '../../contracts/billing/FeeStructures';
export declare class BillingPropagationEngine {
    /**
     * Distributes pricing changes securely to all dependent systems (wallets, terminals, SMS modules).
     * Ensures hyperscale tenant updates are batched and non-blocking.
     */
    static propagateFeeUpdate(newConfig: FeeConfiguration): Promise<boolean>;
    private static updateCentralCache;
    private static notifyFleetTerminals;
    private static syncWithExternalLedgers;
    private static verifyPropagationConsistency;
}
