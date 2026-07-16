"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.integrationEngine = void 0;
const events_1 = require("events");
const supabase_1 = require("../db/supabase");
const commission_engine_service_1 = require("./commission-engine.service");
const gamification_service_1 = require("./gamification.service");
const incentive_engine_service_1 = require("./incentive-engine.service");
const crypto = __importStar(require("crypto"));
class IntegrationEngineService extends events_1.EventEmitter {
    constructor() {
        super();
        this.setupSubscribers();
    }
    /**
     * Publishes an event dynamically, persisting to the ledger and emitting internally.
     */
    async publish(eventType, sourceModule, entityId, payload) {
        const rawPayload = JSON.stringify(payload);
        // Create an idempotency hash
        const eventHash = crypto
            .createHash('sha256')
            .update(`${eventType}-${entityId}-${rawPayload}`)
            .digest('hex');
        try {
            // 1. Insert into integration_events
            const { data, error } = await supabase_1.supabaseAdmin
                .from('integration_events')
                .insert({
                event_type: eventType,
                source_module: sourceModule,
                entity_id: entityId,
                payload: payload,
                event_hash: eventHash,
                status: 'PENDING'
            })
                .select('id')
                .single();
            // If there's an error and it's a unique constraint violation, we can ignore or return
            if (error) {
                if (error.code === '23505' || error.message?.includes('unique constraint')) {
                    console.warn(`[IntegrationEngine] Event already published (idempotent skip): ${eventHash}`);
                    return;
                }
                throw error;
            }
            const eventId = data?.id;
            // 2. Emit internally
            this.emit(eventType, {
                id: eventId,
                eventType,
                sourceModule,
                entityId,
                payload,
                eventHash
            });
        }
        catch (err) {
            console.error(`[IntegrationEngine] Failed to publish event ${eventType}:`, err);
        }
    }
    setupSubscribers() {
        // Subscriber mapping
        this.on('FIRST_TRANSACTION', this.handleWalletEvents.bind(this));
        this.on('FULLY_ACTIVATED', this.handleWalletEvents.bind(this));
        // M5 (Gamification)
        this.on('TERMINAL_ASSIGNED', this.handleGamificationEvents.bind(this));
        this.on('TERMINAL_DEPLOYED', this.handleGamificationEvents.bind(this));
        this.on('REPUTATION_TRIGGER', this.handleGamificationEvents.bind(this));
        this.on('FIRST_TRANSACTION', this.handleGamificationEvents.bind(this));
        this.on('FULLY_ACTIVATED', this.handleGamificationEvents.bind(this));
        // M6 (Analytics)
        this.on('ANALYTICS_UPDATE', this.handleAnalyticsEvents.bind(this));
        this.on('LEAD_CONVERTED', this.handleAnalyticsEvents.bind(this)); // can also log to analytics
        // M7 (Incentives)
        this.on('FIRST_TRANSACTION', this.handleIncentiveEvents.bind(this));
        this.on('FULLY_ACTIVATED', this.handleIncentiveEvents.bind(this));
        // M1 (Activation) / defaults
        this.on('KYC_APPROVED', this.handleGenericEvent.bind(this));
    }
    async markEventProcessed(eventId) {
        if (!eventId)
            return;
        await supabase_1.supabaseAdmin
            .from('integration_events')
            .update({ status: 'PROCESSED', processed_at: new Date().toISOString() })
            .eq('id', eventId);
    }
    async checkIdempotency(eventHash) {
        const { data } = await supabase_1.supabaseAdmin
            .from('integration_events')
            .select('status')
            .eq('event_hash', eventHash)
            .single();
        if (data && data.status === 'PROCESSED') {
            console.warn(`[IntegrationEngine] Skipping already processed event: ${eventHash}`);
            return false; // already processed
        }
        return true; // okay to process
    }
    async handleWalletEvents(event) {
        if (!(await this.checkIdempotency(event.eventHash)))
            return;
        try {
            if (event.eventType === 'FIRST_TRANSACTION' || event.eventType === 'FULLY_ACTIVATED') {
                const { agentId, tenantId, merchantCategoryId } = event.payload;
                // Delegate to CommissionEngineService
                await commission_engine_service_1.CommissionEngineService.evaluateAcquisitionReward(agentId || event.entityId, tenantId || 'tenant-default', merchantCategoryId || 'default');
            }
            await this.markEventProcessed(event.id);
        }
        catch (err) {
            console.error(`[IntegrationEngine] M3 (Wallet) subscriber error:`, err);
        }
    }
    async handleGamificationEvents(event) {
        if (!(await this.checkIdempotency(event.eventHash)))
            return;
        try {
            const { agentId, points, reason } = event.payload;
            const targetAgentId = agentId || event.entityId;
            if (points) {
                // Explicit reputation points
                await gamification_service_1.GamificationService.injectReputation(targetAgentId, points, reason || event.eventType);
            }
            else {
                // Auto-assigned milestone points
                if (event.eventType === 'TERMINAL_DEPLOYED') {
                    await gamification_service_1.GamificationService.injectReputation(targetAgentId, 10, 'Terminal Deployed');
                }
                else if (event.eventType === 'TERMINAL_ASSIGNED') {
                    await gamification_service_1.GamificationService.injectReputation(targetAgentId, 5, 'Terminal Assigned');
                }
                else if (event.eventType === 'FIRST_TRANSACTION') {
                    await gamification_service_1.GamificationService.injectReputation(targetAgentId, 25, 'First Transaction Milestone');
                }
                else if (event.eventType === 'FULLY_ACTIVATED') {
                    await gamification_service_1.GamificationService.injectReputation(targetAgentId, 50, 'Tenant Fully Activated');
                }
            }
            await this.markEventProcessed(event.id);
        }
        catch (err) {
            console.error(`[IntegrationEngine] M5 (Gamification) subscriber error:`, err);
        }
    }
    async handleAnalyticsEvents(event) {
        if (!(await this.checkIdempotency(event.eventHash)))
            return;
        try {
            // M6: Push requests into analytics_refresh_queue instead of synchronous execution
            await supabase_1.supabaseAdmin
                .from('analytics_refresh_queue')
                .insert({
                event_type: event.eventType,
                payload: event.payload,
                status: 'PENDING'
            });
            await this.markEventProcessed(event.id);
        }
        catch (err) {
            console.error(`[IntegrationEngine] M6 (Analytics) subscriber error:`, err);
        }
    }
    async handleIncentiveEvents(event) {
        if (!(await this.checkIdempotency(event.eventHash)))
            return;
        try {
            // M7: Delegate to IncentiveEngineService
            const { agentId } = event.payload;
            const targetAgentId = agentId || event.entityId;
            if (targetAgentId) {
                await incentive_engine_service_1.IncentiveEngineService.evaluateTargets(targetAgentId, event.eventType, event.payload);
            }
            await this.markEventProcessed(event.id);
        }
        catch (err) {
            console.error(`[IntegrationEngine] M7 (Incentives) subscriber error:`, err);
        }
    }
    async handleGenericEvent(event) {
        if (!(await this.checkIdempotency(event.eventHash)))
            return;
        try {
            console.log(`[IntegrationEngine] Handled generic event: ${event.eventType}`);
            await this.markEventProcessed(event.id);
        }
        catch (err) {
            console.error(`[IntegrationEngine] Generic subscriber error:`, err);
        }
    }
}
exports.integrationEngine = new IntegrationEngineService();
//# sourceMappingURL=integration-engine.service.js.map