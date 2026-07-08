import { PolicyType, GovernancePolicy } from '../shared/GovernancePolicy';
import { PolicyRegistry }              from '../registry/PolicyRegistry';
import { KillSwitchService }           from './KillSwitchService';
import { GovernanceAuditService }      from '../audit/GovernanceAuditService';

export type EmergencyPolicyOverrideType =
  | 'FREEZE_ALL_POLICIES'       // Freeze current policy set — no changes permitted
  | 'OVERRIDE_TREASURY_LIMIT'   // Override treasury limit to emergency cap
  | 'DISABLE_AML_SCREENING'     // Temporarily disable AML (requires elevated justification)
  | 'FORCE_ROUTING_FALLBACK'    // Force all routing to fallback provider
  | 'SUSPEND_SETTLEMENT';       // Suspend all settlement processing

export interface EmergencyPolicyOverride {
  id: string;
  overrideType: EmergencyPolicyOverrideType;
  activatedBy: string;
  justification: string;
  activatedAt: string;
  resolvedAt: string | null;
  active: boolean;
}

export class EmergencyPolicyService {
  private static overrides: Map<EmergencyPolicyOverrideType, EmergencyPolicyOverride> = new Map();
  private static seq = 0;

  static clearState() {
    this.overrides.clear();
    this.seq = 0;
  }

  static activate(
    overrideType: EmergencyPolicyOverrideType,
    activatedBy: string,
    justification: string
  ): EmergencyPolicyOverride {
    const id = `EPO-${++this.seq}-${Date.now().toString(36).toUpperCase()}`;

    // Side-effects: activate matching kill switches for destructive overrides
    const killMap: Partial<Record<EmergencyPolicyOverrideType, string[]>> = {
      FREEZE_ALL_POLICIES:     [],
      OVERRIDE_TREASURY_LIMIT: [],
      DISABLE_AML_SCREENING:   [],
      FORCE_ROUTING_FALLBACK:  [],
      SUSPEND_SETTLEMENT:      ['SETTLEMENT'],
    };
    for (const ks of killMap[overrideType] ?? []) {
      KillSwitchService.activate(ks as any, `EmergencyPolicyOverride: ${overrideType}`, activatedBy);
    }

    const override: EmergencyPolicyOverride = {
      id,
      overrideType,
      activatedBy,
      justification,
      activatedAt: new Date().toISOString(),
      resolvedAt: null,
      active: true,
    };
    this.overrides.set(overrideType, override);

    GovernanceAuditService.record({
      eventType: 'EMERGENCY_APPROVAL',
      severity: 'CRITICAL',
      actor: activatedBy,
      targetId: overrideType,
      description: `Emergency policy override ACTIVATED: ${overrideType}. Justification: ${justification}`,
      correlationId: id,
    });

    return override;
  }

  static resolve(overrideType: EmergencyPolicyOverrideType, resolvedBy: string): boolean {
    const override = this.overrides.get(overrideType);
    if (!override || !override.active) return false;
    this.overrides.set(overrideType, {
      ...override,
      active: false,
      resolvedAt: new Date().toISOString(),
    });
    return true;
  }

  static isActive(overrideType: EmergencyPolicyOverrideType): boolean {
    return this.overrides.get(overrideType)?.active === true;
  }

  static getActiveOverrides(): EmergencyPolicyOverride[] {
    return Array.from(this.overrides.values()).filter((o) => o.active);
  }
}
