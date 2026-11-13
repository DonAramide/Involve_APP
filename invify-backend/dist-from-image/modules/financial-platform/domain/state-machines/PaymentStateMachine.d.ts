export declare enum PaymentIntentState {
    CREATED = "CREATED",
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    SUCCEEDED = "SUCCEEDED",
    FAILED = "FAILED"
}
export declare enum PaymentAttemptState {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    SUCCEEDED = "SUCCEEDED",
    FAILED = "FAILED"
}
export declare class PaymentStateMachine {
    private static intentTransitions;
    private static attemptTransitions;
    static canTransitionIntent(from: PaymentIntentState, to: PaymentIntentState): boolean;
    static transitionIntent(from: PaymentIntentState, to: PaymentIntentState): PaymentIntentState;
    static canTransitionAttempt(from: PaymentAttemptState, to: PaymentAttemptState): boolean;
    static transitionAttempt(from: PaymentAttemptState, to: PaymentAttemptState): PaymentAttemptState;
}
