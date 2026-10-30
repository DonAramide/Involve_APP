export declare enum RefundState {
    REQUESTED = "REQUESTED",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    REVERSED = "REVERSED"
}
export declare class RefundStateMachine {
    private static transitions;
    static canTransition(from: RefundState, to: RefundState): boolean;
    static transition(from: RefundState, to: RefundState): RefundState;
}
