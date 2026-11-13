import { EventEmitter } from 'events';
declare class IntegrationEngineService extends EventEmitter {
    constructor();
    /**
     * Publishes an event dynamically, persisting to the ledger and emitting internally.
     */
    publish(eventType: string, sourceModule: string, entityId: string, payload: any): Promise<void>;
    private setupSubscribers;
    private markEventProcessed;
    private checkIdempotency;
    private handleWalletEvents;
    private handleGamificationEvents;
    private handleAnalyticsEvents;
    private handleIncentiveEvents;
    private handleGenericEvent;
}
export declare const integrationEngine: IntegrationEngineService;
export {};
