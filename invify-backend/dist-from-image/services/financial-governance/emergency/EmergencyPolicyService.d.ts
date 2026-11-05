export type EmergencyPolicyOverrideType = 'FREEZE_ALL_POLICIES' | 'OVERRIDE_TREASURY_LIMIT' | 'DISABLE_AML_SCREENING' | 'FORCE_ROUTING_FALLBACK' | 'SUSPEND_SETTLEMENT';
export interface EmergencyPolicyOverride {
    id: string;
    overrideType: EmergencyPolicyOverrideType;
    activatedBy: string;
    justification: string;
    activatedAt: string;
    resolvedAt: string | null;
    active: boolean;
}
export declare class EmergencyPolicyService {
    private static overrides;
    private static seq;
    static clearState(): void;
    static activate(overrideType: EmergencyPolicyOverrideType, activatedBy: string, justification: string): EmergencyPolicyOverride;
    static resolve(overrideType: EmergencyPolicyOverrideType, resolvedBy: string): boolean;
    static isActive(overrideType: EmergencyPolicyOverrideType): boolean;
    static getActiveOverrides(): EmergencyPolicyOverride[];
}
