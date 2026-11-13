"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentStateMachine = exports.PaymentAttemptState = exports.PaymentIntentState = void 0;
var PaymentIntentState;
(function (PaymentIntentState) {
    PaymentIntentState["CREATED"] = "CREATED";
    PaymentIntentState["PENDING"] = "PENDING";
    PaymentIntentState["PROCESSING"] = "PROCESSING";
    PaymentIntentState["SUCCEEDED"] = "SUCCEEDED";
    PaymentIntentState["FAILED"] = "FAILED";
})(PaymentIntentState || (exports.PaymentIntentState = PaymentIntentState = {}));
var PaymentAttemptState;
(function (PaymentAttemptState) {
    PaymentAttemptState["PENDING"] = "PENDING";
    PaymentAttemptState["PROCESSING"] = "PROCESSING";
    PaymentAttemptState["SUCCEEDED"] = "SUCCEEDED";
    PaymentAttemptState["FAILED"] = "FAILED";
})(PaymentAttemptState || (exports.PaymentAttemptState = PaymentAttemptState = {}));
class PaymentStateMachine {
    static intentTransitions = {
        [PaymentIntentState.CREATED]: [PaymentIntentState.PENDING, PaymentIntentState.FAILED],
        [PaymentIntentState.PENDING]: [PaymentIntentState.PROCESSING, PaymentIntentState.FAILED],
        [PaymentIntentState.PROCESSING]: [PaymentIntentState.SUCCEEDED, PaymentIntentState.FAILED],
        [PaymentIntentState.SUCCEEDED]: [],
        [PaymentIntentState.FAILED]: [PaymentIntentState.PENDING], // Allow retry
    };
    static attemptTransitions = {
        [PaymentAttemptState.PENDING]: [PaymentAttemptState.PROCESSING, PaymentAttemptState.FAILED],
        [PaymentAttemptState.PROCESSING]: [PaymentAttemptState.SUCCEEDED, PaymentAttemptState.FAILED],
        [PaymentAttemptState.SUCCEEDED]: [],
        [PaymentAttemptState.FAILED]: [],
    };
    static canTransitionIntent(from, to) {
        return this.intentTransitions[from]?.includes(to) ?? false;
    }
    static transitionIntent(from, to) {
        if (!this.canTransitionIntent(from, to)) {
            throw new Error(`Invalid payment intent state transition from ${from} to ${to}`);
        }
        return to;
    }
    static canTransitionAttempt(from, to) {
        return this.attemptTransitions[from]?.includes(to) ?? false;
    }
    static transitionAttempt(from, to) {
        if (!this.canTransitionAttempt(from, to)) {
            throw new Error(`Invalid payment attempt state transition from ${from} to ${to}`);
        }
        return to;
    }
}
exports.PaymentStateMachine = PaymentStateMachine;
//# sourceMappingURL=PaymentStateMachine.js.map