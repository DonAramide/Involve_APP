import { PoolClient } from 'pg';
import { LedgerService } from './ledger.service';
import {
  allocationIdentity,
} from './school-fund-ownership';
import {
  isSchoolParentWalletPayment,
  newParentAllocationIdempotencyKey,
} from './virtual-account-ownership';

/**
 * New parent deposits only. Historical USER_WALLET rows are not scanned or rewritten.
 * One invoice identity posts at most one school credit.
 */
export class ParentAllocationService {
  static async creditSchoolOnce(params: {
    tenantId: string;
    invoiceNumber?: string | null;
    reference?: string | null;
    paymentMethod?: string | null;
    amountNaira: number;
    historicalBackfill?: boolean;
    businessMode?: string | null;
    studentId?: string | number | null;
    pgClient?: PoolClient;
  }): Promise<{ status: 'CREATED' | 'SKIPPED' | 'DE-DUPLICATED'; reason?: string }> {
    if (params.historicalBackfill) {
      return { status: 'SKIPPED', reason: 'historical_backfill_forbidden' };
    }
    if (!isSchoolParentWalletPayment(params.paymentMethod, {
      businessMode: params.businessMode,
      studentId: params.studentId,
    })) {
      return { status: 'SKIPPED', reason: 'not_parent_wallet' };
    }
    const identity = allocationIdentity(String(params.invoiceNumber || params.reference || ''));
    if (!identity) return { status: 'SKIPPED', reason: 'missing_identity' };
    const amount = Number(params.amountNaira);
    if (!(amount > 0)) return { status: 'SKIPPED', reason: 'no_amount' };
    let posted: { status: string };
    try {
      posted = await LedgerService.allocateParentCredit({
        idempotencyKey: newParentAllocationIdempotencyKey(params.tenantId, identity),
        tenantId: params.tenantId,
        reference: identity,
        amountNaira: amount,
        metadata: {
          source: 'new_parent_allocation',
          schoolWalletCredit: true,
          historicalBackfill: false,
          actorId: 'SYSTEM_PARENT_ALLOCATION',
        },
      }, params.pgClient ? { pgClient: params.pgClient } : undefined);
    } catch (err: any) {
      if (err?.code === 'INSUFFICIENT_PARENT_LIABILITY' || err?.message === 'insufficient_parent_credit') {
        return { status: 'SKIPPED', reason: 'insufficient_parent_credit' };
      }
      throw err;
    }
    if ((posted as any)?.status === 'DE-DUPLICATED') {
      return { status: 'DE-DUPLICATED' };
    }
    return { status: 'CREATED' };
  }
}
