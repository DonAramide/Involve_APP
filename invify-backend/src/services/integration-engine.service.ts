import { EventEmitter } from 'events';
import { supabaseAdmin } from '../db/supabase';
import { CommissionEngineService } from './commission-engine.service';
import { GamificationService } from './gamification.service';
import { ApprovalWorkflowService } from './approval-workflow.service';
import { IncentiveEngineService } from './incentive-engine.service';
import * as crypto from 'crypto';

class IntegrationEngineService extends EventEmitter {
  constructor() {
    super();
    this.setupSubscribers();
  }

  /**
   * Publishes an event dynamically, persisting to the ledger and emitting internally.
   */
  async publish(
    eventType: string,
    sourceModule: string,
    entityId: string,
    payload: any
  ): Promise<void> {
    const rawPayload = JSON.stringify(payload);
    // Create an idempotency hash
    const eventHash = crypto
      .createHash('sha256')
      .update(`${eventType}-${entityId}-${rawPayload}`)
      .digest('hex');

    try {
      // 1. Insert into integration_events
      const { data, error } = await supabaseAdmin
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
    } catch (err) {
      console.error(`[IntegrationEngine] Failed to publish event ${eventType}:`, err);
    }
  }

  private setupSubscribers() {
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

  private async markEventProcessed(eventId: string) {
    if (!eventId) return;
    await supabaseAdmin
      .from('integration_events')
      .update({ status: 'PROCESSED', processed_at: new Date().toISOString() })
      .eq('id', eventId);
  }

  private async checkIdempotency(eventHash: string): Promise<boolean> {
    const { data } = await supabaseAdmin
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

  private async handleWalletEvents(event: any) {
    if (!(await this.checkIdempotency(event.eventHash))) return;

    try {
      if (event.eventType === 'FIRST_TRANSACTION' || event.eventType === 'FULLY_ACTIVATED') {
        const { agentId, tenantId, merchantCategoryId } = event.payload;
        // Delegate to CommissionEngineService
        await CommissionEngineService.evaluateAcquisitionReward(
          agentId || event.entityId, 
          tenantId || 'tenant-default', 
          merchantCategoryId || 'default'
        );
      }
      await this.markEventProcessed(event.id);
    } catch (err) {
      console.error(`[IntegrationEngine] M3 (Wallet) subscriber error:`, err);
    }
  }

  private async handleGamificationEvents(event: any) {
    if (!(await this.checkIdempotency(event.eventHash))) return;

    try {
      const { agentId, points, reason } = event.payload;
      const targetAgentId = agentId || event.entityId;

      if (points) {
        // Explicit reputation points
        await GamificationService.injectReputation(targetAgentId, points, reason || event.eventType);
      } else {
         // Auto-assigned milestone points
         if (event.eventType === 'TERMINAL_DEPLOYED') {
            await GamificationService.injectReputation(targetAgentId, 10, 'Terminal Deployed');
         } else if (event.eventType === 'TERMINAL_ASSIGNED') {
            await GamificationService.injectReputation(targetAgentId, 5, 'Terminal Assigned');
         } else if (event.eventType === 'FIRST_TRANSACTION') {
            await GamificationService.injectReputation(targetAgentId, 25, 'First Transaction Milestone');
         } else if (event.eventType === 'FULLY_ACTIVATED') {
            await GamificationService.injectReputation(targetAgentId, 50, 'Tenant Fully Activated');
         }
      }
      await this.markEventProcessed(event.id);
    } catch (err) {
      console.error(`[IntegrationEngine] M5 (Gamification) subscriber error:`, err);
    }
  }

  private async handleAnalyticsEvents(event: any) {
    if (!(await this.checkIdempotency(event.eventHash))) return;

    try {
      // M6: Push requests into analytics_refresh_queue instead of synchronous execution
      await supabaseAdmin
        .from('analytics_refresh_queue')
        .insert({
          event_type: event.eventType,
          payload: event.payload,
          status: 'PENDING'
        });
      await this.markEventProcessed(event.id);
    } catch (err) {
      console.error(`[IntegrationEngine] M6 (Analytics) subscriber error:`, err);
    }
  }

  private async handleIncentiveEvents(event: any) {
    if (!(await this.checkIdempotency(event.eventHash))) return;

    try {
      // M7: Delegate to IncentiveEngineService
      const { agentId } = event.payload;
      const targetAgentId = agentId || event.entityId;
      
      if (targetAgentId) {
        await IncentiveEngineService.evaluateTargets(targetAgentId, event.eventType, event.payload);
      }
      
      await this.markEventProcessed(event.id);
    } catch (err) {
      console.error(`[IntegrationEngine] M7 (Incentives) subscriber error:`, err);
    }
  }
  
  private async handleGenericEvent(event: any) {
    if (!(await this.checkIdempotency(event.eventHash))) return;
    try {
        console.log(`[IntegrationEngine] Handled generic event: ${event.eventType}`);
        await this.markEventProcessed(event.id);
    } catch (err) {
        console.error(`[IntegrationEngine] Generic subscriber error:`, err);
    }
  }
}

export const integrationEngine = new IntegrationEngineService();
