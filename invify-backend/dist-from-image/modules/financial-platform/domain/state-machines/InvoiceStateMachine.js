"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceStateMachine = exports.InvoiceState = void 0;
var InvoiceState;
(function (InvoiceState) {
    InvoiceState["DRAFT"] = "DRAFT";
    InvoiceState["ISSUED"] = "ISSUED";
    InvoiceState["PARTIALLY_PAID"] = "PARTIALLY_PAID";
    InvoiceState["OVERDUE"] = "OVERDUE";
    InvoiceState["CANCELLED"] = "CANCELLED";
    InvoiceState["CLOSED"] = "CLOSED";
})(InvoiceState || (exports.InvoiceState = InvoiceState = {}));
class InvoiceStateMachine {
    static transitions = {
        [InvoiceState.DRAFT]: [InvoiceState.ISSUED, InvoiceState.CANCELLED],
        [InvoiceState.ISSUED]: [InvoiceState.PARTIALLY_PAID, InvoiceState.CLOSED, InvoiceState.OVERDUE, InvoiceState.CANCELLED],
        [InvoiceState.PARTIALLY_PAID]: [InvoiceState.CLOSED, InvoiceState.OVERDUE, InvoiceState.CANCELLED],
        [InvoiceState.OVERDUE]: [InvoiceState.PARTIALLY_PAID, InvoiceState.CLOSED, InvoiceState.CANCELLED],
        [InvoiceState.CANCELLED]: [],
        [InvoiceState.CLOSED]: [],
    };
    static canTransition(from, to) {
        return this.transitions[from]?.includes(to) ?? false;
    }
    static transition(from, to) {
        if (!this.canTransition(from, to)) {
            throw new Error(`Invalid invoice state transition from ${from} to ${to}`);
        }
        return to;
    }
}
exports.InvoiceStateMachine = InvoiceStateMachine;
//# sourceMappingURL=InvoiceStateMachine.js.map