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
exports.EvidenceChainService = void 0;
const crypto = __importStar(require("crypto"));
class EvidenceChainService {
    static lastHash = crypto.createHash('sha256').update('GENESIS-BLOCK').digest('hex');
    static clearChain() {
        this.lastHash = crypto.createHash('sha256').update('GENESIS-BLOCK').digest('hex');
    }
    static linkAndHash(evidence) {
        evidence.previousHash = this.lastHash;
        const hashPayload = JSON.stringify({
            evidenceId: evidence.evidenceId,
            gate: evidence.gate,
            collector: evidence.collector,
            source: evidence.source,
            collectedAt: evidence.collectedAt,
            confidence: evidence.confidence,
            status: evidence.status,
            rawData: evidence.rawData,
            correlationId: evidence.correlationId,
            previousHash: evidence.previousHash
        });
        const hash = crypto.createHash('sha256').update(hashPayload).digest('hex');
        evidence.hash = hash;
        this.lastHash = hash;
        return evidence;
    }
    static getLastHash() {
        return this.lastHash;
    }
    static verifyChain(evidences) {
        let currentPrevHash = crypto.createHash('sha256').update('GENESIS-BLOCK').digest('hex');
        for (const ev of evidences) {
            if (ev.previousHash !== currentPrevHash) {
                return false;
            }
            const payload = JSON.stringify({
                evidenceId: ev.evidenceId,
                gate: ev.gate,
                collector: ev.collector,
                source: ev.source,
                collectedAt: ev.collectedAt,
                confidence: ev.confidence,
                status: ev.status,
                rawData: ev.rawData,
                correlationId: ev.correlationId,
                previousHash: ev.previousHash
            });
            const recalculatedHash = crypto.createHash('sha256').update(payload).digest('hex');
            if (ev.hash !== recalculatedHash) {
                return false;
            }
            currentPrevHash = ev.hash;
        }
        return true;
    }
}
exports.EvidenceChainService = EvidenceChainService;
//# sourceMappingURL=EvidenceChainService.js.map