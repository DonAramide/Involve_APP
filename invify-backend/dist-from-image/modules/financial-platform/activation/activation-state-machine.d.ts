export declare enum ConnectionStatus {
    UNPROVISIONED = "UNPROVISIONED",
    PROVISIONING = "PROVISIONING",
    ACTIVE = "ACTIVE",
    DEGRADED = "DEGRADED",
    SUSPENDING = "SUSPENDING",
    SUSPENDED = "SUSPENDED",
    FAILED = "FAILED",
    DEACTIVATED = "DEACTIVATED"
}
export declare class ActivationStateMachine {
    static getValidTransitions(currentStatus: ConnectionStatus): ConnectionStatus[];
    static canTransition(currentStatus: ConnectionStatus, newStatus: ConnectionStatus): boolean;
}
