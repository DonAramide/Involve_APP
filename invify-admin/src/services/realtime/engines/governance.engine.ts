import { EnterpriseEventV1, EventPriority } from '../../../domains/core/events/enterprise.event';
import { globalEventBus } from './event.bus';
import { useRuntimeStore } from '../../../stores/runtime.store'; // For tenant ID lookup

export enum SubscriptionState {
  REQUESTED = 'REQUESTED',
  AUTHORIZED = 'AUTHORIZED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  RECOVERING = 'RECOVERING',
  CLOSED = 'CLOSED'
}

export interface ChannelPolicy {
  maxEventsPerSecond: number;
  burstCapacity: number;
  maxPayloadSizeKB: number;
  allowReplay: boolean;
  priority: EventPriority;
  retentionHours: number;
}

export class ChannelPolicyRegistry {
  private policies = new Map<string, ChannelPolicy>();

  constructor() {
    // Default Enterprise Policies
    this.registerPolicy('finance', { maxEventsPerSecond: 100, burstCapacity: 200, maxPayloadSizeKB: 500, allowReplay: true, priority: EventPriority.CRITICAL, retentionHours: 720 });
    this.registerPolicy('inventory', { maxEventsPerSecond: 500, burstCapacity: 1000, maxPayloadSizeKB: 250, allowReplay: true, priority: EventPriority.HIGH, retentionHours: 168 });
    this.registerPolicy('operations', { maxEventsPerSecond: 50, burstCapacity: 100, maxPayloadSizeKB: 100, allowReplay: true, priority: EventPriority.NORMAL, retentionHours: 720 });
  }

  registerPolicy(namespace: string, policy: ChannelPolicy) {
    this.policies.set(namespace, policy);
  }

  getPolicy(channel: string): ChannelPolicy {
    const namespace = channel.split(':')[1] || 'default';
    return this.policies.get(namespace) || { maxEventsPerSecond: 100, burstCapacity: 100, maxPayloadSizeKB: 256, allowReplay: false, priority: EventPriority.NORMAL, retentionHours: 24 };
  }
}

export class GovernanceRateLimiter {
  private tokens = new Map<string, { count: number, lastRefill: number }>();

  checkLimit(channel: string, policy: ChannelPolicy): boolean {
    const now = Date.now();
    let bucket = this.tokens.get(channel);

    if (!bucket || (now - bucket.lastRefill > 1000)) {
      // Refill bucket every second
      bucket = { count: policy.maxEventsPerSecond, lastRefill: now };
    }

    if (bucket.count <= 0) return false;
    
    bucket.count--;
    this.tokens.set(channel, bucket);
    return true;
  }
}

export class RealtimeGovernanceEngine {
  public policyRegistry = new ChannelPolicyRegistry();
  private rateLimiter = new GovernanceRateLimiter();
  
  public metrics = {
    authorizationFailures: 0,
    schemaViolations: 0,
    rateLimitTrips: 0,
    policyViolations: 0,
    activeSubscriptions: new Map<string, SubscriptionState>()
  };

  private emitGovernanceAudit(action: string, details: any) {
    globalEventBus.dispatch({
      eventId: crypto.randomUUID(),
      event: `infra.governance.${action}`,
      version: 1,
      timestamp: new Date().toISOString(),
      sequenceNumber: 0,
      correlationId: crypto.randomUUID(),
      tenantId: 'system',
      priority: EventPriority.CRITICAL,
      payload: details
    });
  }

  // 1. Subscription Lifecycle & Authorization
  authorizeSubscription(channel: string, tenantId: string): boolean {
    this.metrics.activeSubscriptions.set(channel, SubscriptionState.REQUESTED);
    
    // Check Tenant Boundary
    const activeTenantId = useRuntimeStore().tenantId;
    if (channel.includes('tenant_') && !channel.includes(activeTenantId)) {
      this.metrics.authorizationFailures++;
      this.metrics.activeSubscriptions.set(channel, SubscriptionState.CLOSED);
      this.emitGovernanceAudit('subscription.rejected', { channel, reason: 'TENANT_MISMATCH' });
      return false;
    }

    this.metrics.activeSubscriptions.set(channel, SubscriptionState.AUTHORIZED);
    this.emitGovernanceAudit('subscription.authorized', { channel, tenantId });
    
    setTimeout(() => {
       if(this.metrics.activeSubscriptions.get(channel) === SubscriptionState.AUTHORIZED) {
          this.metrics.activeSubscriptions.set(channel, SubscriptionState.ACTIVE);
       }
    }, 100);

    return true;
  }

  // 2. Event Interception & Validation
  validateEvent(channel: string, event: EnterpriseEventV1): { valid: boolean, action: 'ALLOW' | 'REJECT' | 'DEGRADE' | 'DISCONNECT' } {
    const policy = this.policyRegistry.getPolicy(channel);

    // Schema Validation (Tier 1 Violation)
    if (!event.eventId || !event.sequenceNumber || !event.tenantId) {
      this.metrics.schemaViolations++;
      this.emitGovernanceAudit('event.rejected', { reason: 'SCHEMA_VIOLATION', eventId: event?.eventId || 'unknown' });
      
      if (this.metrics.schemaViolations > 50) return { valid: false, action: 'DEGRADE' };
      return { valid: false, action: 'REJECT' }; // Reject single malformed without disconnect
    }

    // Tenant Isolation (Tier 3 Violation)
    const activeTenantId = useRuntimeStore().tenantId;
    if (event.tenantId !== activeTenantId && event.tenantId !== 'system') {
      this.metrics.policyViolations++;
      this.emitGovernanceAudit('event.rejected', { reason: 'TENANT_ISOLATION_BREACH', eventId: event.eventId });
      return { valid: false, action: 'DISCONNECT' }; // Immediate kill for security breach attempt
    }

    // Payload Size Limit
    const payloadSizeKB = new Blob([JSON.stringify(event.payload)]).size / 1024;
    if (payloadSizeKB > policy.maxPayloadSizeKB) {
      this.metrics.policyViolations++;
      this.emitGovernanceAudit('event.rejected', { reason: 'PAYLOAD_TOO_LARGE', sizeKB: payloadSizeKB, channel });
      return { valid: false, action: 'REJECT' };
    }

    // Rate Limiting
    if (!this.rateLimiter.checkLimit(channel, policy)) {
      this.metrics.rateLimitTrips++;
      // Only drop if it's not a CRITICAL priority event
      if (event.priority !== EventPriority.CRITICAL) {
        return { valid: false, action: 'REJECT' };
      }
    }

    return { valid: true, action: 'ALLOW' };
  }
}
