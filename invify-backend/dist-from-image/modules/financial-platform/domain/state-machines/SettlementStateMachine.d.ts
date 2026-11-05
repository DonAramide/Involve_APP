export declare enum SettlementState {
    PAID = "PAID",
    SETTLEMENT_PENDING = "SETTLEMENT_PENDING",
    SETTLED = "SETTLED",
    RECONCILED = "RECONCILED"
}
export declare class SettlementStateMachine {
    private static transitions;
    static canTransition(from: SettlementState, to: SettlementState): boolean;
    static transition(from: SettlementState, to: SettlementState): SettlementState;
}
