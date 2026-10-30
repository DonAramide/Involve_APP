export type KillSwitchTarget = 'TRANSFERS' | 'WITHDRAWALS' | 'SETTLEMENT' | 'TREASURY' | 'VIRTUAL_ACCOUNTS' | 'WEBHOOK_PROCESSING' | 'VERIFICATION' | 'QUEUES' | 'ALL_PROVIDERS' | string;
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
export declare class KillSwitchService {
    private static switches;
    private static seq;
    static clearState(): void;
    static activate(target: KillSwitchTarget, reason: string, activatedBy: string): KillSwitch;
    static deactivate(target: KillSwitchTarget, deactivatedBy: string): boolean;
    static isKilled(target: KillSwitchTarget): boolean;
    static getActiveKillSwitches(): KillSwitch[];
    static getAllKillSwitches(): KillSwitch[];
    /**
     * Check if a given operation type is killed.
     * Maps OperationType strings to KillSwitch targets.
     */
    static isOperationKilled(operationType: string, metadata?: Record<string, any>): {
        killed: boolean;
        activeTargets: string[];
    };
}
