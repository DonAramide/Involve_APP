import { randomUUID } from 'crypto';
import { FeePostingResult } from './fee-ledger-poster';
import {
  DEFAULT_MAX_ATTEMPTS,
  FeeOutboxError,
  FeeOutboxEvent,
  FeePostingOutboxStore,
  NewFeeOutboxEvent,
} from './fee-posting-outbox';

function cloneEvent(event: FeeOutboxEvent): FeeOutboxEvent {
  return {
    ...event,
    payload: JSON.parse(JSON.stringify(event.payload)),
    next_attempt_at: new Date(event.next_attempt_at),
    locked_at: event.locked_at ? new Date(event.locked_at) : null,
    completed_at: event.completed_at ? new Date(event.completed_at) : null,
  };
}

/** In-process store with the same claim/lease/terminal semantics as the SQL table. */
export class MemoryFeePostingOutboxStore implements FeePostingOutboxStore {
  private readonly byKey = new Map<string, FeeOutboxEvent>();

  async enqueue(input: NewFeeOutboxEvent) {
    const existing = this.byKey.get(input.idempotency_key);
    if (existing) return { event: cloneEvent(existing), created: false };
    const event: FeeOutboxEvent = {
      ...input,
      payload: JSON.parse(JSON.stringify(input.payload)),
      id: randomUUID(),
      status: 'PENDING',
      attempts: 0,
      max_attempts: input.max_attempts ?? DEFAULT_MAX_ATTEMPTS,
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

  async claim(workerId: string, limit: number, now: Date, leaseMs: number) {
    const due = [...this.byKey.values()]
      .filter(
        (e) =>
          ((e.status === 'PENDING' || e.status === 'RETRY') && e.next_attempt_at.getTime() <= now.getTime()) ||
          (e.status === 'PROCESSING' && e.locked_at !== null && e.locked_at.getTime() < now.getTime() - leaseMs),
      )
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

  private owned(id: string, workerId: string): FeeOutboxEvent | null {
    const event = [...this.byKey.values()].find((e) => e.id === id);
    if (!event || event.status !== 'PROCESSING' || event.locked_by !== workerId) return null;
    return event;
  }

  async markDone(id: string, workerId: string, result: FeePostingResult, now: Date) {
    const event = this.owned(id, workerId);
    if (!event) return false;
    event.status = 'DONE';
    event.ledger_result = result;
    event.completed_at = new Date(now);
    event.locked_by = null;
    event.locked_at = null;
    return true;
  }

  async markRetry(id: string, workerId: string, error: FeeOutboxError, nextAttemptAt: Date) {
    const event = this.owned(id, workerId);
    if (!event) return false;
    event.status = 'RETRY';
    event.last_error = error.message;
    event.last_error_code = error.code;
    event.next_attempt_at = new Date(nextAttemptAt);
    event.locked_by = null;
    event.locked_at = null;
    return true;
  }

  async markNeedsAttention(id: string, workerId: string, error: FeeOutboxError) {
    const event = this.owned(id, workerId);
    if (!event) return false;
    event.status = 'NEEDS_ATTENTION';
    event.last_error = error.message;
    event.last_error_code = error.code;
    event.locked_by = null;
    event.locked_at = null;
    return true;
  }

  async findByKey(idempotencyKey: string) {
    const event = this.byKey.get(idempotencyKey);
    return event ? cloneEvent(event) : null;
  }

  all(): FeeOutboxEvent[] {
    return [...this.byKey.values()].map(cloneEvent);
  }
}

function rowToEvent(row: any): FeeOutboxEvent {
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
    max_attempts: Number(row.max_attempts || DEFAULT_MAX_ATTEMPTS),
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
export class SupabaseFeePostingOutboxStore implements FeePostingOutboxStore {
  private async db() {
    const { supabaseAdmin } = await import('../db/supabase');
    return supabaseAdmin;
  }

  async enqueue(input: NewFeeOutboxEvent) {
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
        max_attempts: input.max_attempts ?? DEFAULT_MAX_ATTEMPTS,
      })
      .select('*')
      .single();
    if (!error && data) return { event: rowToEvent(data), created: true };
    const existing = await this.findByKey(input.idempotency_key);
    if (existing) return { event: existing, created: false };
    throw new Error(`fee outbox enqueue failed: ${error?.message || 'unknown'}`);
  }

  async claim(workerId: string, limit: number, _now: Date, leaseMs: number) {
    const db = await this.db();
    const { data, error } = await db.rpc('claim_fee_posting_outbox', {
      p_worker: workerId,
      p_limit: limit,
      p_lease_seconds: Math.max(1, Math.round(leaseMs / 1000)),
    });
    if (error) throw new Error(`fee outbox claim failed: ${error.message}`);
    return ((data as any[]) || []).map(rowToEvent);
  }

  private async transition(id: string, workerId: string, patch: Record<string, unknown>) {
    const db = await this.db();
    const { data, error } = await db
      .from('fee_posting_outbox')
      .update(patch)
      .eq('id', id)
      .eq('locked_by', workerId)
      .eq('status', 'PROCESSING')
      .select('id');
    if (error) throw new Error(`fee outbox transition failed: ${error.message}`);
    return Array.isArray(data) && data.length === 1;
  }

  markDone(id: string, workerId: string, result: FeePostingResult, now: Date) {
    return this.transition(id, workerId, {
      status: 'DONE',
      ledger_result: result,
      completed_at: now.toISOString(),
      locked_by: null,
      locked_at: null,
    });
  }

  markRetry(id: string, workerId: string, error: FeeOutboxError, nextAttemptAt: Date) {
    return this.transition(id, workerId, {
      status: 'RETRY',
      last_error: error.message.slice(0, 2000),
      last_error_code: error.code,
      next_attempt_at: nextAttemptAt.toISOString(),
      locked_by: null,
      locked_at: null,
    });
  }

  markNeedsAttention(id: string, workerId: string, error: FeeOutboxError) {
    return this.transition(id, workerId, {
      status: 'NEEDS_ATTENTION',
      last_error: error.message.slice(0, 2000),
      last_error_code: error.code,
      locked_by: null,
      locked_at: null,
    });
  }

  async findByKey(idempotencyKey: string) {
    const db = await this.db();
    const { data } = await db
      .from('fee_posting_outbox')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    return data ? rowToEvent(data) : null;
  }
}
