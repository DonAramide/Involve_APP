import { RealtimeProvider } from '../providers/realtime.provider';
import { globalEventBus } from './event.bus';
import { EventDeduplicator } from './event.deduplicator';
import { EnterpriseEventV1 } from '../../../domains/core/events/enterprise.event';
import { RealtimeGovernanceEngine } from './governance.engine';
import { ChaosController } from './chaos.engine';

export class MetricsCollector {
  connectedChannels = 0;
  eventsProcessed = 0;
  duplicateEvents = 0;
  missedEvents = 0;
  reconnectCount = 0;
  lastHeartbeatLatencyMs = 0;
  invalidPayloads = 0;
  cacheInvalidations = 0;
  queueDepth = 0;
  replayRequests = 0;
  
  // Event Inspector
  latestProcessedEvent: EnterpriseEventV1 | null = null;
  
  // Live Timeline (limit to 50 for memory)
  timeline: Array<{ time: string, message: string, type: 'info'|'warn'|'error' }> = [];
}


export class RealtimeHealthService {
  private metrics: MetricsCollector;
  private provider: RealtimeProvider;
  private heartbeatTimer?: any;

  constructor(provider: RealtimeProvider, metrics: MetricsCollector) {
    this.provider = provider;
    this.metrics = metrics;
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.provider.isConnected()) {
        // Simulated latency check
        this.metrics.lastHeartbeatLatencyMs = Math.floor(Math.random() * 50) + 10;
        globalEventBus.dispatch({
          eventId: crypto.randomUUID(),
          event: 'infra.heartbeat',
          version: 1,
          timestamp: new Date().toISOString(),
          sequenceNumber: 0,
          correlationId: crypto.randomUUID(),
          tenantId: 'system',
          payload: {
            latencyMs: this.metrics.lastHeartbeatLatencyMs,
            activeChannels: this.metrics.connectedChannels
          }
        });
      }
    }, 10000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }
}

export class EnterpriseRealtimeKernel {
  private provider: RealtimeProvider;
  private deduplicator = new EventDeduplicator();
  public metrics = new MetricsCollector();
  public healthService: RealtimeHealthService;
  public governance = new RealtimeGovernanceEngine();
  public chaos = new ChaosController(this.governance);
  
  // Track the highest sequence number per channel/topic to enforce ordering
  private sequenceCursors = new Map<string, number>();

  constructor(provider: RealtimeProvider) {
    this.provider = provider;
    this.healthService = new RealtimeHealthService(this.provider, this.metrics);
    this.logTimeline('Kernel initialized with ' + this.provider.name, 'info');
  }

  private logTimeline(message: string, type: 'info'|'warn'|'error' = 'info') {
    this.metrics.timeline.unshift({
      time: new Date().toISOString().split('T')[1].split('.')[0],
      message,
      type
    });
    if (this.metrics.timeline.length > 50) this.metrics.timeline.pop();
  }

  async start() {
    this.logTimeline('Connecting to provider...', 'info');
    await this.provider.connect();
    this.healthService.startHeartbeat();
    this.logTimeline('Heartbeat started', 'info');
  }

  async stop() {
    this.logTimeline('Stopping kernel...', 'warn');
    this.healthService.stopHeartbeat();
    await this.provider.disconnect();
  }

  subscribe(channel: string) {
    this.logTimeline(`Subscribing to channel: ${channel}`, 'info');
    if (!this.governance.authorizeSubscription(channel, 'system')) {
       this.logTimeline(`Governance blocked subscription to ${channel}`, 'error');
       return;
    }
    this.provider.subscribe(channel, (event: EnterpriseEventV1) => this.processIncomingEvent(channel, event));
    this.metrics.connectedChannels++;
  }

  unsubscribe(channel: string) {
    this.logTimeline(`Unsubscribing from channel: ${channel}`, 'info');
    this.provider.unsubscribe(channel);
    this.metrics.connectedChannels--;
  }

  private processIncomingEvent(channel: string, event: EnterpriseEventV1) {
    this.metrics.queueDepth++;
    
    // 0. Governance Validation (Schema, Rate limits, Payload Size, Tenant Isolation)
    const authResult = this.governance.validateEvent(channel, event);
    if (!authResult.valid) {
       this.metrics.invalidPayloads++;
       this.metrics.queueDepth--;
       this.logTimeline(`Governance rejected event on ${channel}: ${authResult.action}`, 'error');
       
       if (authResult.action === 'DISCONNECT') {
         this.stop();
       }
       return;
    }

    // 1. Deduplication Check
    if (this.deduplicator.isDuplicate(event)) {
      this.metrics.duplicateEvents++;
      this.metrics.queueDepth--;
      this.logTimeline(`Dropped duplicate event: ${event.eventId}`, 'warn');
      return;
    }

    // 2. Ordering Check (Reject Stale Events)
    const cursorKey = `${channel}:${event.event}`;
    const lastSeq = this.sequenceCursors.get(cursorKey) || 0;
    
    if (event.sequenceNumber <= lastSeq) {
      this.metrics.queueDepth--;
      this.logTimeline(`Dropped stale event (seq: ${event.sequenceNumber} <= ${lastSeq})`, 'warn');
      return;
    }

    // Update cursor
    this.sequenceCursors.set(cursorKey, event.sequenceNumber);

    // Detect missed events
    if (event.sequenceNumber > lastSeq + 1 && lastSeq > 0) {
      this.metrics.missedEvents += (event.sequenceNumber - lastSeq - 1);
      this.logTimeline(`Missed events detected on ${channel}. Triggering replay.`, 'error');
      this.metrics.replayRequests++;
      this.provider.requestReplay(channel, event.eventId);
    }

    // Track Cache Invalidations
    if (event.event === 'infra.cache.invalidated') {
       this.metrics.cacheInvalidations++;
    }

    // Event Inspector Update
    this.metrics.latestProcessedEvent = event;

    // 3. Dispatch to internal EventBus
    this.metrics.eventsProcessed++;
    this.metrics.queueDepth--;
    globalEventBus.dispatch(event);
  }
}
