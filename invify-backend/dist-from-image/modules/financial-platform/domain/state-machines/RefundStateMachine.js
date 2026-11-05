"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundStateMachine = exports.RefundState = void 0;
var RefundState;
(function (RefundState) {
    RefundState["REQUESTED"] = "REQUESTED";
    RefundState["PROCESSING"] = "PROCESSING";
    RefundState["COMPLETED"] = "COMPLETED";
    RefundState["FAILED"] = "FAILED";
    RefundState["REVERSED"] = "REVERSED";
})(RefundState || (exports.RefundState = RefundState = {}));
class RefundStateMachine {
    static transitions = {
        [RefundState.REQUESTED]: [RefundState.PROCESSING, RefundState.FAILED],
        [RefundState.PROCESSING]: [RefundState.COMPLETED, RefundState.FAILED],
        [RefundState.COMPLETED]: [RefundState.REVERSED],
        [RefundState.FAILED]: [],
        [RefundState.REVERSED]: [],
    };
    static canTransition(from, to) {
        return this.transitions[from]?.includes(to) ?? false;
    }
    static transition(from, to) {
        if (!this.canTransition(from, to)) {
            throw new Error(`Invalid refund state transition from ${from} to ${to}`);
        }
        return to;
    }
}
exports.RefundStateMachine = RefundStateMachine;
//# sourceMappingURL=RefundStateMachine.js.map