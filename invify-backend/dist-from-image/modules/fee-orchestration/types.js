"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeOrchestrationError = exports.REQUIRED_SPLIT_BPS = void 0;
exports.REQUIRED_SPLIT_BPS = 10000;
class FeeOrchestrationError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'FeeOrchestrationError';
    }
}
exports.FeeOrchestrationError = FeeOrchestrationError;
//# sourceMappingURL=types.js.map