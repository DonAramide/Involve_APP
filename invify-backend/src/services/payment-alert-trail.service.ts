import { supabaseAdmin } from '../db/supabase';

export type PaymentAlertInput = {
  tenantId: string;
  reference: string;
  amount: number;
  payload?: Record<string, any>;
};

const PAYMENT_ALERT_RETRY_MS = 6_000;

/** Keep resending every 6 seconds until the tablet acknowledges receipt. */
export function nextPaymentAlertDelayMs(_attempts: number): number {
  return PAYMENT_ALERT_RETRY_MS;
}

export function tenantSocketCount(io: any, tenantId: string): number {
  const room = io?.sockets?.adapter?.rooms?.get?.(`tenant:${tenantId}`);
  return room?.size || 0;
}

function socketBody(row: any) {
  const payload = row.payload || {};
  return {
    type: 'payment.success',
    reference: row.reference,
    tenantId: row.tenant_id,
    walletId: payload.walletId || null,
    amount: Number(row.amount),
    customerId: payload.customerId || null,
    studentId: payload.studentId || null,
    metadata: payload.metadata || {},
    alertId: row.id,
    createdAt: row.created_at,
  };
}

export class PaymentAlertTrailService {
  static async recordAndEmit(io: any, input: PaymentAlertInput): Promise<void> {
    const reference = String(input.reference || '').trim();
    const tenantId = String(input.tenantId || '').trim();
    if (!reference || !tenantId) return;

    let row: any = null;
    try {
      const { data: existing } = await supabaseAdmin
        .from('payment_alert_deliveries')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('reference', reference)
        .maybeSingle();

      if (existing?.status === 'delivered') return;

      if (!existing) {
        const { data: inserted, error } = await supabaseAdmin
          .from('payment_alert_deliveries')
          .insert({
            tenant_id: tenantId,
            reference,
            amount: Number(input.amount) || 0,
            payload: input.payload || {},
            status: 'pending',
            attempts: 0,
            next_attempt_at: new Date().toISOString(),
          })
          .select('*')
          .single();
        if (error) throw error;
        row = inserted;
      } else {
        row = existing;
      }
    } catch (err: any) {
      console.warn('[PaymentAlert] trail write failed, emitting once:', err?.message || err);
      this.emit(io, {
        tenant_id: tenantId,
        reference,
        amount: input.amount,
        payload: input.payload || {},
        created_at: new Date().toISOString(),
      });
      return;
    }

    if (tenantSocketCount(io, tenantId) > 0) {
      await this.markAttempt(io, row);
    } else {
      this.emit(io, row);
    }
  }

  static emit(io: any, row: any) {
    if (!io || !row?.tenant_id || !row?.reference) return;
    const body = socketBody(row);
    const room = `tenant:${row.tenant_id}`;
    io.to(room).emit('payment.success', body);
    const firstTry = Number(row.attempts || 0) === 0;
    if (firstTry) {
      const amount = Number(body.amount) || 0;
      const sender = body.metadata?.studentName || body.metadata?.senderName || 'a payer';
      const formatted = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
      io.to(room).emit('app_broadcast', {
        message: `₦${formatted} received from ${sender}`,
        timestamp: new Date().toISOString(),
        type: 'payment',
        reference: body.reference,
      });
    }
    console.log(`[PaymentAlert] socket payment.success tenant=${row.tenant_id} ref=${row.reference}`);
  }

  static async markAttempt(io: any, row: any) {
    const attemptsSoFar = Number(row.attempts || 0);
    this.emit(io, row);
    const now = new Date();
    const next = new Date(now.getTime() + nextPaymentAlertDelayMs(attemptsSoFar + 1));
    await supabaseAdmin
      .from('payment_alert_deliveries')
      .update({
        status: 'pending',
        attempts: attemptsSoFar + 1,
        last_attempt_at: now.toISOString(),
        next_attempt_at: next.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', row.id)
      .eq('status', 'pending');
  }

  static async acknowledge(tenantId: string, reference: string, deviceId?: string | null): Promise<boolean> {
    const ref = String(reference || '').trim();
    const tenant = String(tenantId || '').trim();
    if (!ref || !tenant) return false;
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('payment_alert_deliveries')
      .update({
        status: 'delivered',
        delivered_at: now,
        delivered_device_id: deviceId || null,
        updated_at: now,
      })
      .eq('tenant_id', tenant)
      .eq('reference', ref)
      .eq('status', 'pending')
      .select('id');
    if (error) {
      console.warn('[PaymentAlert] ack failed:', error.message);
      return false;
    }
    if (data && data.length) {
      console.log(`[PaymentAlert] delivered tenant=${tenant} ref=${ref}`);
    }
    return Boolean(data && data.length);
  }

  static async flushTenant(io: any, tenantId: string): Promise<number> {
    if (!tenantId || tenantSocketCount(io, tenantId) < 1) return 0;
    const { data, error } = await supabaseAdmin
      .from('payment_alert_deliveries')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50);
    if (error || !data?.length) return 0;
    for (const row of data) {
      await this.markAttempt(io, row);
    }
    return data.length;
  }

  static async retryDue(io: any): Promise<number> {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('payment_alert_deliveries')
      .select('*')
      .eq('status', 'pending')
      .lte('next_attempt_at', now)
      .order('next_attempt_at', { ascending: true })
      .limit(50);
    if (error || !data?.length) return 0;
    let sent = 0;
    for (const row of data) {
      if (tenantSocketCount(io, row.tenant_id) < 1) continue;
      await this.markAttempt(io, row);
      sent += 1;
    }
    return sent;
  }

  static async listForTenant(tenantId: string) {
    const { data, error } = await supabaseAdmin
      .from('payment_alert_deliveries')
      .select('id, reference, amount, status, attempts, created_at, delivered_at, last_attempt_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) return [];
    return data || [];
  }
}
