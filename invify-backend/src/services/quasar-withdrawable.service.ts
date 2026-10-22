import { supabaseAdmin } from '../db/supabase';

const locks = new Map<string, Promise<unknown>>();

export function withTenantWithdrawLock<T>(tenantId: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(tenantId) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(task);
  locks.set(
    tenantId,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

function roundNaira(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/**
 * Shared card + spent virtual-account pool.
 * Devices upload the settleable slices. Pending and successful payouts reduce it
 * so two devices cannot each take the full amount.
 */
export class QuasarWithdrawableService {
  static async sync(tenantId: string, credits: any[]): Promise<number> {
    const rows = (credits || [])
      .map((credit) => {
        const reference = String(credit.reference || credit.localInvoiceNumber || '').trim();
        const amount = roundNaira(Number(credit.amount || 0));
        if (!reference || !(amount > 0)) return null;
        const rail = String(credit.rail || 'va').toLowerCase() === 'card' ? 'card' : 'va';
        return {
          tenant_id: tenantId,
          local_invoice_number: `qwd:${reference}`,
          amount,
          payment_method: rail === 'card' ? 'Card' : 'VirtualAccount',
          payment_status: 'Paid',
          metadata: { quasarSettleable: true, rail },
          paid_at: credit.paidAt || credit.at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      })
      .filter(Boolean);

    if (rows.length) {
      const { error } = await supabaseAdmin
        .from('school_payment_events')
        .upsert(rows, { onConflict: 'tenant_id,local_invoice_number' });
      if (error) throw new Error(error.message);
    }

    const available = await this.available(tenantId);
    await this.publish(tenantId, available);
    return available;
  }

  static async available(tenantId: string): Promise<number> {
    const [{ data: credits }, { data: payouts }] = await Promise.all([
      supabaseAdmin
        .from('school_payment_events')
        .select('amount, metadata, payment_status')
        .eq('tenant_id', tenantId)
        .eq('metadata->>quasarSettleable', 'true')
        .limit(5000),
      supabaseAdmin
        .from('transactions_log')
        .select('amount, status, type')
        .eq('tenant_id', tenantId)
        .eq('type', 'payout')
        .in('status', ['PENDING', 'SUCCESS', 'PROCESSING'])
        .eq('metadata->>quasarCap', 'true')
        .limit(5000),
    ]);

    let gross = 0;
    for (const row of credits || []) {
      const meta = (row as any).metadata || {};
      if (meta.quasarSettleable !== true) continue;
      if (String((row as any).payment_status || '').toLowerCase() === 'pending') continue;
      gross += Number((row as any).amount || 0);
    }
    let reserved = 0;
    for (const row of payouts || []) {
      reserved += Number((row as any).amount || 0);
    }
    return roundNaira(Math.max(0, gross - reserved));
  }

  static async publish(tenantId: string, available: number): Promise<void> {
    try {
      const { io } = await import('../app');
      io.to(`tenant:${tenantId}`).emit('withdrawable_updated', {
        tenantId,
        available,
      });
    } catch (err: any) {
      console.warn('[QuasarWithdrawable] socket publish skipped:', err?.message || err);
    }
  }
}
