import { GovernanceAuditService } from '../audit/GovernanceAuditService';

export type KillSwitchTarget =
  | 'TRANSFERS'
  | 'WITHDRAWALS'
  | 'SETTLEMENT'
  | 'TREASURY'
  | 'VIRTUAL_ACCOUNTS'
  | 'WEBHOOK_PROCESSING'
  | 'VERIFICATION'
  | 'QUEUES'
  | 'ALL_PROVIDERS'
  | string; // allows PROVIDER:PAYSTACK, TENANT:tenant-123, CURRENCY:USD, EVENT:CREDIT

export interface KillSwitch {
  id: string;
  target: KillSwitchTarget;
  reason: string;
  activatedBy: string;
  activatedAt: string;
  deactivatedAt: string | null;
  deactivatedBy: string | null;
  active: boolean;
}

export class KillSwitchService {
  private static switches: Map<KillSwitchTarget, KillSwitch> = new Map();
  private static seq = 0;

  static clearState() {
    this.switches.clear();
    this.seq = 0;
  }

  static activate(target: KillSwitchTarget, reason: string, activatedBy: string): KillSwitch {
    const id = `KS-${++this.seq}-${Date.now().toString(36).toUpperCase()}`;
    const ks: KillSwitch = {
      id,
      target,
      reason,
      activatedBy,
      activatedAt: new Date().toISOString(),
      deactivatedAt: null,
      deactivatedBy: null,
      active: true,
    };
    this.switches.set(target, ks);

    GovernanceAuditService.record({
      eventType: 'KILL_SWITCH_ACTIVATED',
      severity: 'CRITICAL',
      actor: activatedBy,
      targetId: target,
      description: `Kill switch ACTIVATED for target=${target}. Reason: ${reason}`,
      correlationId: id,
    });

    return ks;
  }

  static deactivate(target: KillSwitchTarget, deactivatedBy: string): boolean {
    const ks = this.switches.get(target);
    if (!ks || !ks.active) return false;

    const updated: KillSwitch = {
      ...ks,
      active: false,
      deactivatedAt: new Date().toISOString(),
      deactivatedBy,
    };
    this.switches.set(target, updated);

    GovernanceAuditService.record({
      eventType: 'KILL_SWITCH_DEACTIVATED',
      severity: 'WARN',
      actor: deactivatedBy,
      targetId: target,
      description: `Kill switch DEACTIVATED for target=${target} by ${deactivatedBy}.`,
      correlationId: ks.id,
    });

    return true;
  }

  static isKilled(target: KillSwitchTarget): boolean {
    return this.switches.get(target)?.active === true;
  }

  static getActiveKillSwitches(): KillSwitch[] {
    return Array.from(this.switches.values()).filter((ks) => ks.active);
  }

  static getAllKillSwitches(): KillSwitch[] {
    return Array.from(this.switches.values());
  }

  /**
   * Check if a given operation type is killed.
   * Maps OperationType strings to KillSwitch targets.
   */
  static isOperationKilled(operationType: string, metadata?: Record<string, any>): { killed: boolean; activeTargets: string[] } {
    const operationMap: Record<string, KillSwitchTarget[]> = {
      TRANSFER:         ['TRANSFERS'],
      WITHDRAWAL:       ['WITHDRAWALS'],
      SETTLEMENT:       ['SETTLEMENT'],
      TREASURY_MOVEMENT:['TREASURY'],
      VIRTUAL_ACCOUNT:  ['VIRTUAL_ACCOUNTS'],
      WEBHOOK_CREDIT:   ['WEBHOOK_PROCESSING'],
      VERIFICATION:     ['VERIFICATION'],
    };

    const targets = operationMap[operationType] ?? [];
    const hitTargets: string[] = [];

    for (const target of targets) {
      if (this.isKilled(target)) hitTargets.push(target);
    }

    // Check provider-specific kill switches
    if (metadata?.provider && this.isKilled(`PROVIDER:${metadata.provider}`)) {
      hitTargets.push(`PROVIDER:${metadata.provider}`);
    }
    // Check tenant-specific
    if (metadata?.tenantId && this.isKilled(`TENANT:${metadata.tenantId}`)) {
      hitTargets.push(`TENANT:${metadata.tenantId}`);
    }
    // Check currency-specific
    if (metadata?.currency && this.isKilled(`CURRENCY:${metadata.currency}`)) {
      hitTargets.push(`CURRENCY:${metadata.currency}`);
    }

    return { killed: hitTargets.length > 0, activeTargets: hitTargets };
  }
}
