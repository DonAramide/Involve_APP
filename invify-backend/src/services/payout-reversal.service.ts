import { supabaseAdmin } from '../db/supabase';
import { AuditService } from './audit.service';
import { LedgerService } from './ledger.service';

/**
 * Payout accounting model (reserve at initiation):
 *   initiation  request_payout_with_lock      DEBIT USER_WALLET / CREDIT EXTERNAL_BANK
 *   success     no ledger movement (funds already left the wallet at initiation)
 *   failure     this service                 DEBIT EXTERNAL_BANK / CREDIT USER_WALLET
 *
 * The reversal amount is always derived from the original initiation ledger,
 * never from webhook payloads, so a failure can only restore what was debited.
 */

export type PayoutReversalSource =
  | 'SYNC_TRANSFER_REJECTED'
  | 'WEBHOOK_PAYOUT_FAILED'
  | 'POLL_PAYOUT_FAILED';

export type PayoutReversalResult =
  | { status: 'REVERSED'; amountKobo: number; idempotencyKey: string }
  | { status: 'ALREADY_REVERSED'; amountKobo: number; idempotencyKey: string }
  | { status: 'NOTHING_TO_REVERSE'; amountKobo: 0; idempotencyKey: string };

export function payoutReversalIdempotencyKey(tenantId: string, reference: string): string {
  return `payout-reversal:${tenantId}:${reference}`;
}

/** Initiation ledgers are keyed `payout:{tenant}:{clientKey}` or `payout:{reference}`. */
export function isPayoutInitiationKey(idempotencyKey: string): boolean {
  return idempotencyKey.startsWith('payout:');
}

const NON_DEFINITIVE_HTTP = new Set([408, 409, 423, 425, 429]);

/**
 * True only when the provider definitively rejected the transfer request, so no
 * money can have left. Timeouts, network errors, 5xx and unknown shapes are
 * ambiguous and must wait for the webhook / reconciliation instead.
 */
export function isDefinitiveTransferRejection(error: any): boolean {
  const status = Number(
    error?.response?.status ?? error?.statusCode ?? error?.status ?? error?.httpStatus ?? error?.responseCode,
  );
  if (Number.isInteger(status) && status >= 400 && status < 500 && !NON_DEFINITIVE_HTTP.has(status)) {
    return true;
  }
  // Quasar validation failures arrive as QuasarApiError with the provider message
  // and sometimes without a numeric HTTP status. No money has left.
  const message = String(error?.message || '');
  return /must be an object|should not exist|must be a|validation failed/i.test(message);
}

function isUniqueViolation(error: any): boolean {
  const message = String(error?.message || error || '');
  return /duplicate key|unique constraint|23505/i.test(message);
}

export class PayoutReversalService {
  static async reverseFailedPayout(params: {
    tenantId: string;
    reference: string;
    reason: string;
    source: PayoutReversalSource;
  }): Promise<PayoutReversalResult> {
    const { tenantId, reference, reason, source } = params;
    const idempotencyKey = payoutReversalIdempotencyKey(tenantId, reference);

    const { data: ledgers, error: ledgerErr } = await supabaseAdmin
      .from('ledgers')
      .select('id, idempotency_key')
      .eq('tenant_id', tenantId)
      .eq('reference', reference);
    if (ledgerErr) {
      throw new Error(`Payout reversal lookup failed for ${reference}: ${ledgerErr.message}`);
    }

    const rows = (ledgers || []) as Array<{ id: string; idempotency_key: string }>;
    const originals = rows.filter((row) => isPayoutInitiationKey(String(row.idempotency_key)));
    const amountKobo = await PayoutReversalService.netWalletDebitKobo(originals.map((row) => row.id));

    if (rows.some((row) => row.idempotency_key === idempotencyKey)) {
      return { status: 'ALREADY_REVERSED', amountKobo, idempotencyKey };
    }
    if (amountKobo <= 0) {
      await PayoutReversalService.audit('payout.reversal_skipped', tenantId, reference, {
        reason,
        source,
        detail: 'NO_ORIGINAL_WALLET_DEBIT',
      });
      return { status: 'NOTHING_TO_REVERSE', amountKobo: 0, idempotencyKey };
    }

    const reverseEntries = await PayoutReversalService.invertOriginalEntries(originals.map((row) => row.id));
    if (!reverseEntries.length) {
      return { status: 'NOTHING_TO_REVERSE', amountKobo: 0, idempotencyKey };
    }

    try {
      const result: any = await LedgerService.createDoubleEntry({
        idempotencyKey,
        tenantId,
        reference,
        entries: reverseEntries,
        actorId: 'SYSTEM_PAYOUT_REVERSAL',
        provider: 'quasar',
        metadata: {
          type: 'payout_reversal',
          reason,
          source,
          original_ledger_ids: originals.map((row) => row.id),
        },
      });
      if (result?.status === 'DE-DUPLICATED' || result?.data?.status === 'DE-DUPLICATED') {
        return { status: 'ALREADY_REVERSED', amountKobo, idempotencyKey };
      }
    } catch (err: any) {
      if (isUniqueViolation(err) && (await LedgerService.exists(idempotencyKey))) {
        return { status: 'ALREADY_REVERSED', amountKobo, idempotencyKey };
      }
      throw err;
    }

    await PayoutReversalService.audit('payout.reversed', tenantId, reference, {
      reason,
      source,
      amount_kobo: amountKobo,
      idempotency_key: idempotencyKey,
    });
    return { status: 'REVERSED', amountKobo, idempotencyKey };
  }

  static async hasReversal(tenantId: string, reference: string): Promise<boolean> {
    return LedgerService.exists(payoutReversalIdempotencyKey(tenantId, reference));
  }

  /**
   * RESERVED: initiation debit present and not reversed — success needs no posting.
   * REVERSED_BEFORE_SUCCESS: funds were already restored; a later success means money left twice.
   * NO_ORIGINAL_DEBIT: no initiation ledger — never invent one from a webhook.
   */
  static async settlementState(
    tenantId: string,
    reference: string,
  ): Promise<'RESERVED' | 'REVERSED_BEFORE_SUCCESS' | 'NO_ORIGINAL_DEBIT'> {
    const { data: ledgers, error } = await supabaseAdmin
      .from('ledgers')
      .select('id, idempotency_key')
      .eq('tenant_id', tenantId)
      .eq('reference', reference);
    if (error) {
      throw new Error(`Payout settlement lookup failed for ${reference}: ${error.message}`);
    }
    const rows = (ledgers || []) as Array<{ id: string; idempotency_key: string }>;
    if (rows.some((row) => row.idempotency_key === payoutReversalIdempotencyKey(tenantId, reference))) {
      return 'REVERSED_BEFORE_SUCCESS';
    }
    const originals = rows.filter((row) => isPayoutInitiationKey(String(row.idempotency_key)));
    const debited = await PayoutReversalService.netWalletDebitKobo(originals.map((row) => row.id));
    return debited > 0 ? 'RESERVED' : 'NO_ORIGINAL_DEBIT';
  }

  private static async invertOriginalEntries(ledgerIds: string[]): Promise<Array<{ account: any; type: 'DEBIT' | 'CREDIT'; amount: number }>> {
    if (!ledgerIds.length) return [];
    const { data: entries, error } = await supabaseAdmin
      .from('ledger_entries')
      .select('account, type, amount')
      .in('ledger_id', ledgerIds);
    if (error) {
      throw new Error(`Payout reversal entry lookup failed: ${error.message}`);
    }
    const inverted: Array<{ account: any; type: 'DEBIT' | 'CREDIT'; amount: number }> = [];
    for (const entry of (entries || []) as Array<{ account: string; type: string; amount: number | string }>) {
      const amount = Number(entry.amount);
      if (!(amount > 0)) continue;
      inverted.push({
        account: entry.account,
        type: entry.type === 'DEBIT' ? 'CREDIT' : 'DEBIT',
        amount,
      });
    }
    return inverted;
  }

  private static async netWalletDebitKobo(ledgerIds: string[]): Promise<number> {
    if (!ledgerIds.length) return 0;
    const { data: entries, error } = await supabaseAdmin
      .from('ledger_entries')
      .select('account, type, amount')
      .in('ledger_id', ledgerIds);
    if (error) {
      throw new Error(`Payout reversal entry lookup failed: ${error.message}`);
    }
    let net = 0;
    for (const entry of (entries || []) as Array<{ account: string; type: string; amount: number | string }>) {
      if (entry.account !== 'USER_WALLET') continue;
      const amount = Number(entry.amount);
      if (entry.type === 'DEBIT') net += amount;
      else if (entry.type === 'CREDIT') net -= amount;
    }
    return net;
  }

  private static async audit(eventType: string, tenantId: string, reference: string, payload: Record<string, unknown>) {
    try {
      await AuditService.log({ eventType: eventType as any, reference, tenantId, payload });
    } catch (err: any) {
      console.error(`[PayoutReversal] audit ${eventType} failed for ${reference}:`, err?.message || err);
    }
  }
}
