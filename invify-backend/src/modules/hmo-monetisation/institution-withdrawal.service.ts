import { randomUUID } from 'crypto';
import { BankAccountGovernanceService, BankEntityType } from './bank-account-governance.service';
import { gateInstitutionPayout } from './posting-gate';

export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'PROCESSING' | 'SUCCESSFUL' | 'FAILED' | 'RELEASED';

export interface InstitutionWithdrawal {
  id: string;
  institutionId: string;
  requesterUserId: string;
  amountKobo: number;
  currency: 'NGN';
  status: WithdrawalStatus;
  bankAccountMasked: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  failureReason?: string | null;
  reserved: boolean;
  settled: false;
  audit: Array<{ at: string; actorId: string; action: string; detail?: string }>;
}

export class InstitutionWithdrawalService {
  readonly rows = new Map<string, InstitutionWithdrawal>();

  constructor(private readonly banks: BankAccountGovernanceService) {}

  list(institutionId: string) {
    return [...this.rows.values()]
      .filter((row) => row.institutionId === institutionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  reservedKobo(institutionId: string) {
    return this.list(institutionId)
      .filter((row) => row.reserved && !['FAILED', 'RELEASED', 'SUCCESSFUL'].includes(row.status))
      .reduce((sum, row) => sum + row.amountKobo, 0);
  }

  async submit(input: {
    institutionId: string;
    institutionActive: boolean;
    requesterUserId: string;
    amountKobo: number;
    availableKobo: number;
    minKobo?: number;
    maxKobo?: number;
    idempotencyKey?: string;
    entityType?: BankEntityType;
  }) {
    if (!input.institutionActive) {
      throw Object.assign(new Error('Institution must be active to request a withdrawal.'), { status: 409 });
    }
    if (!Number.isInteger(input.amountKobo) || input.amountKobo <= 0) {
      throw Object.assign(new Error('Withdrawal amount must be a positive integer kobo amount.'), { status: 400 });
    }
    const min = input.minKobo ?? 10_000;
    const max = input.maxKobo ?? 50_000_000_00;
    if (input.amountKobo < min || input.amountKobo > max) {
      throw Object.assign(new Error('Withdrawal amount is outside configured limits.'), { status: 400 });
    }
    const approved = await this.banks.approvedAccount(input.entityType || 'INSTITUTION', input.institutionId);
    if (!approved) {
      throw Object.assign(new Error('Only an approved and verified bank account may be used for withdrawals.'), {
        status: 409,
        code: 'BANK_ACCOUNT_UNVERIFIED',
      });
    }
    const key = input.idempotencyKey || `inst-wd:${input.institutionId}:${input.amountKobo}:${approved.accountNumber}`;
    const existing = [...this.rows.values()].find((row) => row.idempotencyKey === key);
    if (existing) return { ...existing, replayed: true, payout: gateInstitutionPayout() };
    const reserved = this.reservedKobo(input.institutionId);
    if (input.amountKobo + reserved > input.availableKobo) {
      throw Object.assign(new Error('Available balance is insufficient after reserved withdrawals.'), {
        status: 409,
        code: 'INSUFFICIENT_BALANCE',
      });
    }
    const now = new Date().toISOString();
    const row: InstitutionWithdrawal = {
      id: randomUUID(),
      institutionId: input.institutionId,
      requesterUserId: input.requesterUserId,
      amountKobo: input.amountKobo,
      currency: 'NGN',
      status: 'PENDING',
      bankAccountMasked: approved.accountNumber,
      idempotencyKey: key,
      createdAt: now,
      updatedAt: now,
      reserved: true,
      settled: false,
      audit: [{ at: now, actorId: input.requesterUserId, action: 'SUBMITTED' }],
    };
    this.rows.set(row.id, row);
    return { ...row, replayed: false, payout: gateInstitutionPayout() };
  }

  async decide(input: { id: string; actorId: string; action: 'APPROVE' | 'REJECT' | 'FAIL' | 'RELEASE' }) {
    const row = this.rows.get(input.id);
    if (!row) throw Object.assign(new Error('Withdrawal was not found.'), { status: 404 });
    if (row.requesterUserId === input.actorId && input.action === 'APPROVE') {
      throw Object.assign(new Error('The requester cannot approve their own withdrawal.'), {
        status: 403,
        code: 'MAKER_CANNOT_APPROVE',
      });
    }
    const now = new Date().toISOString();
    if (input.action === 'APPROVE') {
      row.status = 'APPROVED';
    } else if (input.action === 'FAIL') {
      row.status = 'FAILED';
      row.reserved = false;
      row.failureReason = 'Sandbox payout was not executed.';
    } else if (input.action === 'RELEASE') {
      row.status = 'RELEASED';
      row.reserved = false;
    } else {
      row.status = 'FAILED';
      row.reserved = false;
      row.failureReason = 'Rejected. Reserved funds were released.';
    }
    row.updatedAt = now;
    row.audit.push({ at: now, actorId: input.actorId, action: input.action });
    this.rows.set(row.id, row);
    return { ...row, payout: gateInstitutionPayout() };
  }
}
