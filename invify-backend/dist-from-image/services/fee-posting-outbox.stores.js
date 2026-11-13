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
exports.SupabaseFeePostingOutboxStore = exports.MemoryFeePostingOutboxStore = void 0;
const crypto_1 = require("crypto");
const fee_posting_outbox_1 = require("./fee-posting-outbox");
function cloneEvent(event) {
    return {
        ...event,
        payload: JSON.parse(JSON.stringify(event.payload)),
        next_attempt_at: new Date(event.next_attempt_at),
        locked_at: event.locked_at ? new Date(event.locked_at) : null,
        completed_at: event.completed_at ? new Date(event.completed_at) : null,
    };
}
/** In-process store with the same claim/lease/terminal semantics as the SQL table. */
class MemoryFeePostingOutboxStore {
    byKey = new Map();
    async enqueue(input) {
        const existing = this.byKey.get(input.idempotency_key);
        if (existing)
            return { event: cloneEvent(existing), created: false };
        const event = {
            ...input,
            payload: JSON.parse(JSON.stringify(input.payload)),
            id: (0, crypto_1.randomUUID)(),
            status: 'PENDING',
            attempts: 0,
            max_attempts: input.max_attempts ?? fee_posting_outbox_1.DEFAULT_MAX_ATTEMPTS,
            next_attempt_at: new Date(0),
            locked_at: null,
            locked_by: null,
            last_error: null,
            last_error_code: null,
            ledger_result: null,
            completed_at: null,
        };
        this.byKey.set(input.idempotency_key, event);
        return { event: cloneEvent(event), created: true };
    }
    async claim(workerId, limit, now, leaseMs) {
        const due = [...this.byKey.values()]
            .filter((e) => ((e.status === 'PENDING' || e.status === 'RETRY') && e.next_attempt_at.getTime() <= now.getTime()) ||
            (e.status === 'PROCESSING' && e.locked_at !== null && e.locked_at.getTime() < now.getTime() - leaseMs))
            .sort((a, b) => a.next_attempt_at.getTime() - b.next_attempt_at.getTime())
            .slice(0, Math.max(0, limit));
        for (const e of due) {
            e.status = 'PROCESSING';
            e.locked_at = new Date(now);
            e.locked_by = workerId;
            e.attempts += 1;
        }
        return due.map(cloneEvent);
    }
    owned(id, workerId) {
        const event = [...this.byKey.values()].find((e) => e.id === id);
        if (!event || event.status !== 'PROCESSING' || event.locked_by !== workerId)
            return null;
        return event;
    }
    async markDone(id, workerId, result, now) {
        const event = this.owned(id, workerId);
        if (!event)
            return false;
        event.status = 'DONE';
        event.ledger_result = result;
        event.completed_at = new Date(now);
        event.locked_by = null;
        event.locked_at = null;
        return true;
    }
    async markRetry(id, workerId, error, nextAttemptAt) {
        const event = this.owned(id, workerId);
        if (!event)
            return false;
        event.status = 'RETRY';
        event.last_error = error.message;
        event.last_error_code = error.code;
        event.next_attempt_at = new Date(nextAttemptAt);
        event.locked_by = null;
        event.locked_at = null;
        return true;
    }
    async markNeedsAttention(id, workerId, error) {
        const event = this.owned(id, workerId);
        if (!event)
            return false;
        event.status = 'NEEDS_ATTENTION';
        event.last_error = error.message;
        event.last_error_code = error.code;
        event.locked_by = null;
        event.locked_at = null;
        return true;
    }
    async findByKey(idempotencyKey) {
        const event = this.byKey.get(idempotencyKey);
        return event ? cloneEvent(event) : null;
    }
    all() {
        return [...this.byKey.values()].map(cloneEvent);
    }
}
exports.MemoryFeePostingOutboxStore = MemoryFeePostingOutboxStore;
function rowToEvent(row) {
    return {
        id: String(row.id),
        idempotency_key: String(row.idempotency_key),
        kind: row.kind,
        tenant_id: String(row.tenant_id),
        assessment_id: String(row.assessment_id),
        reversal_id: row.reversal_id ? String(row.reversal_id) : null,
        reference: String(row.reference),
        payload: row.payload,
        status: row.status,
        attempts: Number(row.attempts || 0),
        max_attempts: Number(row.max_attempts || fee_posting_outbox_1.DEFAULT_MAX_ATTEMPTS),
        next_attempt_at: new Date(row.next_attempt_at),
        locked_at: row.locked_at ? new Date(row.locked_at) : null,
        locked_by: row.locked_by || null,
        last_error: row.last_error || null,
        last_error_code: row.last_error_code || null,
        ledger_result: row.ledger_result || null,
        completed_at: row.completed_at ? new Date(row.completed_at) : null,
    };
}
/** Backed by public.fee_posting_outbox (migration 20261003100100, not yet applied). */
class SupabaseFeePostingOutboxStore {
    async db() {
        const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require('../db/supabase')));
        return supabaseAdmin;
    }
    async enqueue(input) {
        const db = await this.db();
        const { data, error } = await db
            .from('fee_posting_outbox')
            .insert({
            idempotency_key: input.idempotency_key,
            kind: input.kind,
            tenant_id: input.tenant_id,
            assessment_id: input.assessment_id,
            reversal_id: input.reversal_id,
            reference: input.reference,
            payload: input.payload,
            max_attempts: input.max_attempts ?? fee_posting_outbox_1.DEFAULT_MAX_ATTEMPTS,
        })
            .select('*')
            .single();
        if (!error && data)
            return { event: rowToEvent(data), created: true };
        const existing = await this.findByKey(input.idempotency_key);
        if (existing)
            return { event: existing, created: false };
        throw new Error(`fee outbox enqueue failed: ${error?.message || 'unknown'}`);
    }
    async claim(workerId, limit, _now, leaseMs) {
        const db = await this.db();
        const { data, error } = await db.rpc('claim_fee_posting_outbox', {
            p_worker: workerId,
            p_limit: limit,
            p_lease_seconds: Math.max(1, Math.round(leaseMs / 1000)),
        });
        if (error)
            throw new Error(`fee outbox claim failed: ${error.message}`);
        return (data || []).map(rowToEvent);
    }
    async transition(id, workerId, patch) {
        const db = await this.db();
        const { data, error } = await db
            .from('fee_posting_outbox')
            .update(patch)
            .eq('id', id)
            .eq('locked_by', workerId)
            .eq('status', 'PROCESSING')
            .select('id');
        if (error)
            throw new Error(`fee outbox transition failed: ${error.message}`);
        return Array.isArray(data) && data.length === 1;
    }
    markDone(id, workerId, result, now) {
        return this.transition(id, workerId, {
            status: 'DONE',
            ledger_result: result,
            completed_at: now.toISOString(),
            locked_by: null,
            locked_at: null,
        });
    }
    markRetry(id, workerId, error, nextAttemptAt) {
        return this.transition(id, workerId, {
            status: 'RETRY',
            last_error: error.message.slice(0, 2000),
            last_error_code: error.code,
            next_attempt_at: nextAttemptAt.toISOString(),
            locked_by: null,
            locked_at: null,
        });
    }
    markNeedsAttention(id, workerId, error) {
        return this.transition(id, workerId, {
            status: 'NEEDS_ATTENTION',
            last_error: error.message.slice(0, 2000),
            last_error_code: error.code,
            locked_by: null,
            locked_at: null,
        });
    }
    async findByKey(idempotencyKey) {
        const db = await this.db();
        const { data } = await db
            .from('fee_posting_outbox')
            .select('*')
            .eq('idempotency_key', idempotencyKey)
            .maybeSingle();
        return data ? rowToEvent(data) : null;
    }
}
exports.SupabaseFeePostingOutboxStore = SupabaseFeePostingOutboxStore;
//# sourceMappingURL=fee-posting-outbox.stores.js.map