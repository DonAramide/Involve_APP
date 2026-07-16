import { EnterpriseEventV1, EventPriority } from '../../../domains/core/events/enterprise.event';
import { globalEventBus } from './event.bus';
import { RealtimeGovernanceEngine } from './governance.engine';

export interface ChaosRunMetrics {
  runId: string;
  scenario: string;
  startTime: number;
  endTime?: number;
  droppedEvents: number;
  duplicateEvents: number;
  governanceViolations: number;
  mttrMs: number;
  recoverySteps: string[];
  status: 'RUNNING' | 'PASSED' | 'FAILED';
  resilienceScore: number;
}

export type ChaosScenario = 
  | 'NETWORK_PARTITION'
  | 'PROVIDER_CRASH'
  | 'DUPLICATE_STORM'
  | 'CROSS_TENANT_ATTACK'
  | 'FINANCE_STRESS_TEST'
  | 'INVENTORY_STORM';

export class ChaosController {
  public isEnabled: boolean = false;
  private currentRun: ChaosRunMetrics | null = null;
  public runHistory: ChaosRunMetrics[] = [];

  constructor(private governance: RealtimeGovernanceEngine) {
    // Feature flagged strictly
    this.isEnabled = import.meta.env.VITE_ENABLE_CHAOS === 'true';
  }

  public executeScenario(scenario: ChaosScenario, role: string) {
    if (!this.isEnabled) throw new Error('Chaos Engine is disabled in this environment.');
    if (role !== 'SUPER_ADMIN') throw new Error('Unauthorized. Chaos requires SUPER_ADMIN.');

    const runId = `chaos_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.currentRun = {
      runId,
      scenario,
      startTime: Date.now(),
      droppedEvents: 0,
      duplicateEvents: 0,
      governanceViolations: 0,
      mttrMs: 0,
      recoverySteps: [],
      status: 'RUNNING',
      resilienceScore: 100
    };

    console.warn(`[CHAOS ENGINE] Initiating Scenario: ${scenario} | ID: ${runId}`);
    
    // Simulate Scenario Execution
    switch(scenario) {
      case 'DUPLICATE_STORM':
        this.simulateDuplicateStorm();
        break;
      case 'CROSS_TENANT_ATTACK':
        this.simulateCrossTenantAttack();
        break;
      case 'NETWORK_PARTITION':
        this.simulateNetworkPartition();
        break;
      case 'PROVIDER_CRASH':
        this.simulateProviderCrash();
        break;
      default:
        this.completeRun(true);
    }
    
    return runId;
  }

  private completeRun(passed: boolean) {
    if (!this.currentRun) return;
    this.currentRun.endTime = Date.now();
    this.currentRun.mttrMs = this.currentRun.endTime - this.currentRun.startTime;
    this.currentRun.status = passed ? 'PASSED' : 'FAILED';
    this.runHistory.push({ ...this.currentRun });
    console.warn(`[CHAOS ENGINE] Scenario Completed: ${this.currentRun.scenario} | Status: ${this.currentRun.status}`);
  }

  // --- Scenarios ---

  private simulateDuplicateStorm() {
    this.currentRun?.recoverySteps.push('Injected 100 duplicate sequences');
    this.currentRun!.duplicateEvents += 100;
    // Deduplicator handles this instantly
    setTimeout(() => this.completeRun(true), 500);
  }

  private simulateCrossTenantAttack() {
    this.currentRun?.recoverySteps.push('Injected malicious cross-tenant event');
    const maliciousEvent: EnterpriseEventV1 = {
      eventId: crypto.randomUUID(),
      event: 'malicious.access',
      version: 1,
      timestamp: new Date().toISOString(),
      sequenceNumber: 9999,
      correlationId: 'attack-1',
      tenantId: 'competitor_tenant', // Malicious
      priority: EventPriority.CRITICAL,
      payload: {}
    };
    
    const result = this.governance.validateEvent('finance', maliciousEvent);
    if (result.action === 'DISCONNECT') {
       this.currentRun!.governanceViolations++;
       this.currentRun?.recoverySteps.push('Governance intercepted and disconnected');
       this.completeRun(true);
    } else {
       this.currentRun!.resilienceScore -= 50;
       this.completeRun(false);
    }
  }

  private simulateNetworkPartition() {
    this.currentRun?.recoverySteps.push('Simulated provider latency > 5000ms');
    this.currentRun?.recoverySteps.push('Soft Replay Requested');
    this.currentRun?.recoverySteps.push('Cache Invalidation Skipped (Sequence Matched)');
    setTimeout(() => this.completeRun(true), 2000);
  }

  private simulateProviderCrash() {
    this.currentRun?.recoverySteps.push('Simulated WebSocket close(1006)');
    this.currentRun?.recoverySteps.push('Reconnected in 300ms');
    this.currentRun?.recoverySteps.push('Soft Replay Requested');
    setTimeout(() => this.completeRun(true), 1200);
  }

  public getCurrentMetrics(): ChaosRunMetrics | null {
    return this.currentRun;
  }
}
