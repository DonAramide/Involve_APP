"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementStateMachine = exports.SettlementState = void 0;
var SettlementState;
(function (SettlementState) {
    SettlementState["PAID"] = "PAID";
    SettlementState["SETTLEMENT_PENDING"] = "SETTLEMENT_PENDING";
    SettlementState["SETTLED"] = "SETTLED";
    SettlementState["RECONCILED"] = "RECONCILED";
})(SettlementState || (exports.SettlementState = SettlementState = {}));
class SettlementStateMachine {
    static transitions = {
        [SettlementState.PAID]: [SettlementState.SETTLEMENT_PENDING],
        [SettlementState.SETTLEMENT_PENDING]: [SettlementState.SETTLED],
        [SettlementState.SETTLED]: [SettlementState.RECONCILED],
        [SettlementState.RECONCILED]: [],
    };
    static canTransition(from, to) {
        return this.transitions[from]?.includes(to) ?? false;
    }
    static transition(from, to) {
        if (!this.canTransition(from, to)) {
            throw new Error(`Invalid settlement state transition from ${from} to ${to}`);
        }
        return to;
    }
}
exports.SettlementStateMachine = SettlementStateMachine;
//# sourceMappingURL=SettlementStateMachine.js.map