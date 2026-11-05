export declare enum InvoiceState {
    DRAFT = "DRAFT",
    ISSUED = "ISSUED",
    PARTIALLY_PAID = "PARTIALLY_PAID",// Pseudo-state or actual state depending on implementation
    OVERDUE = "OVERDUE",
    CANCELLED = "CANCELLED",
    CLOSED = "CLOSED"
}
export declare class InvoiceStateMachine {
    private static transitions;
    static canTransition(from: InvoiceState, to: InvoiceState): boolean;
    static transition(from: InvoiceState, to: InvoiceState): InvoiceState;
}
