"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayDetectionService = void 0;
const crypto = __importStar(require("crypto"));
class ReplayDetectionService {
    /**
     * Computes SHA-256 hash of request body/payload.
     */
    static hashPayload(payload) {
        if (!payload)
            return '';
        const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
        return crypto.createHash('sha256').update(bodyStr).digest('hex');
    }
    /**
     * Verifies if a request timestamp is inside the acceptable sliding replay window.
     * If a request is too old, it's rejected.
     * @param createdAtIso timestamp of key creation
     * @param windowSeconds length of sliding replay window (e.g. 300 seconds / 5 mins)
     */
    static isWithinReplayWindow(createdAtIso, windowSeconds = 300) {
        const elapsed = Date.now() - new Date(createdAtIso).getTime();
        return elapsed >= 0 && elapsed <= windowSeconds * 1000;
    }
}
exports.ReplayDetectionService = ReplayDetectionService;
//# sourceMappingURL=ReplayDetectionService.js.map