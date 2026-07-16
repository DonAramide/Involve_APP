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
exports.CommissionLineageEngine = void 0;
const crypto = __importStar(require("crypto"));
class CommissionLineageEngine {
    /**
     * Records a deterministic, replay-safe commission attribution.
     */
    recordCommissionLineage(sourceTransactionId, replaySequence, commissionVersion, calculatedAmount, payoutAgentCode) {
        const timestamp = new Date().toISOString();
        // Hash includes all deterministic inputs for replay verification
        const lineageHash = this.generateCommissionHash(sourceTransactionId, replaySequence, commissionVersion, calculatedAmount, payoutAgentCode, timestamp);
        const record = {
            commissionId: this.generateUuid(),
            sourceTransactionId,
            replaySequence,
            commissionVersion,
            calculatedAmount,
            payoutAgentCode,
            lineageHash,
            createdAt: new Date(timestamp),
            status: 'PENDING',
        };
        // TODO: Persist immutable commission lineage record to DB
        return record;
    }
    /**
     * Replays a commission sequence to ensure integrity and correct rollback state.
     */
    replayCommissionSequence(sourceTransactionId) {
        // TODO: Fetch all lineage records for sourceTransactionId ordered by replaySequence
        const records = []; // Mock
        let previousSequence = 0;
        for (const record of records) {
            if (record.replaySequence <= previousSequence) {
                throw new Error(`Replay Integrity Error: Invalid sequence ordering for transaction ${sourceTransactionId}`);
            }
            const expectedHash = this.generateCommissionHash(record.sourceTransactionId, record.replaySequence, record.commissionVersion, record.calculatedAmount, record.payoutAgentCode, record.createdAt.toISOString());
            if (record.lineageHash !== expectedHash) {
                throw new Error(`Replay Integrity Error: Hash mismatch at sequence ${record.replaySequence}`);
            }
            previousSequence = record.replaySequence;
        }
        return records;
    }
    generateCommissionHash(txId, seq, version, amount, agentCode, timestamp) {
        const data = `${txId}|${seq}|${version}|${amount}|${agentCode}|${timestamp}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }
    generateUuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
exports.CommissionLineageEngine = CommissionLineageEngine;
//# sourceMappingURL=CommissionLineageEngine.js.map