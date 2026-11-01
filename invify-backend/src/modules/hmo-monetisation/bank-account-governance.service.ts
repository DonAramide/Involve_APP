import { randomUUID } from 'crypto';
import { matchBusinessName, NameMatchResult } from './business-name-match';

export type BankEntityType = 'TENANT' | 'INSTITUTION';
export type BankRequestStatus =
  | 'PENDING_REVIEW'
  | 'PENDING_NAME_VERIFICATION'
  | 'APPROVED'
  | 'REJECTED'
  | 'REQUIRES_MANUAL_REVIEW'
  | 'SUPERSEDED';

export interface BankAccountSnapshot {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface BankAccountUpdateRequest {
  id: string;
  entityType: BankEntityType;
  entityId: string;
  entityName: string;
  requesterUserId: string;
  requesterEmail?: string | null;
  currentAccount: BankAccountSnapshot | null;
  proposedAccount: BankAccountSnapshot;
  nameMatch: NameMatchResult;
  status: BankRequestStatus;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  audit: Array<{ at: string; actorId: string; action: string; detail?: string }>;
}

export interface BankAccountStore {
  list(filter?: { entityType?: BankEntityType; status?: BankRequestStatus | 'ALL'; entityId?: string }): Promise<BankAccountUpdateRequest[]>;
  get(id: string): Promise<BankAccountUpdateRequest | null>;
  insert(row: BankAccountUpdateRequest): Promise<BankAccountUpdateRequest>;
  update(row: BankAccountUpdateRequest): Promise<BankAccountUpdateRequest>;
  approvedFor(entityType: BankEntityType, entityId: string): Promise<BankAccountSnapshot | null>;
}

export class MemoryBankAccountStore implements BankAccountStore {
  readonly rows = new Map<string, BankAccountUpdateRequest>();
  readonly approved = new Map<string, BankAccountSnapshot>();

  private key(entityType: BankEntityType, entityId: string) {
    return `${entityType}:${entityId}`;
  }

  async list(filter?: { entityType?: BankEntityType; status?: BankRequestStatus | 'ALL'; entityId?: string }) {
    return [...this.rows.values()].filter((row) => {
      if (filter?.entityType && row.entityType !== filter.entityType) return false;
      if (filter?.entityId && row.entityId !== filter.entityId) return false;
      if (filter?.status && filter.status !== 'ALL' && row.status !== filter.status) return false;
      return true;
    });
  }

  async get(id: string) {
    return this.rows.get(id) || null;
  }

  async insert(row: BankAccountUpdateRequest) {
    this.rows.set(row.id, row);
    return row;
  }

  async update(row: BankAccountUpdateRequest) {
    this.rows.set(row.id, row);
    if (row.status === 'APPROVED') this.approved.set(this.key(row.entityType, row.entityId), row.proposedAccount);
    return row;
  }

  async approvedFor(entityType: BankEntityType, entityId: string) {
    return this.approved.get(this.key(entityType, entityId)) || null;
  }
}

export function maskAccountNumber(accountNumber: string | null | undefined): string {
  const digits = String(accountNumber || '').replace(/\s+/g, '');
  if (digits.length < 4) return '****';
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export function publicBankView(row: BankAccountUpdateRequest) {
  return {
    ...row,
    currentAccount: row.currentAccount
      ? { ...row.currentAccount, accountNumber: maskAccountNumber(row.currentAccount.accountNumber) }
      : null,
    proposedAccount: {
      ...row.proposedAccount,
      accountNumber: maskAccountNumber(row.proposedAccount.accountNumber),
    },
  };
}

function requireAccount(input: Partial<BankAccountSnapshot>, label: string): BankAccountSnapshot {
  const bankCode = String(input.bankCode || '').trim();
  const bankName = String(input.bankName || '').trim();
  const accountNumber = String(input.accountNumber || '').replace(/\s+/g, '');
  const accountName = String(input.accountName || '').trim();
  if (!bankCode || !accountNumber || !accountName) {
    throw Object.assign(new Error(`${label} requires bankCode, accountNumber and accountName.`), { status: 400 });
  }
  if (!/^\d{10}$/.test(accountNumber)) {
    throw Object.assign(new Error('Account number must be a 10-digit NUBAN.'), { status: 400 });
  }
  return { bankCode, bankName: bankName || bankCode, accountNumber, accountName };
}

export class BankAccountGovernanceService {
  constructor(private readonly store: BankAccountStore) {}

  async list(filter?: { entityType?: BankEntityType; status?: BankRequestStatus | 'ALL'; entityId?: string }) {
    const rows = await this.store.list(filter);
    return rows
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map(publicBankView);
  }

  async get(id: string) {
    const row = await this.store.get(id);
    if (!row) throw Object.assign(new Error('Bank account update request was not found.'), { status: 404 });
    return publicBankView(row);
  }

  async approvedAccount(entityType: BankEntityType, entityId: string) {
    const approved = await this.store.approvedFor(entityType, entityId);
    return approved ? { ...approved, accountNumber: maskAccountNumber(approved.accountNumber) } : null;
  }

  async submit(input: {
    entityType: BankEntityType;
    entityId: string;
    entityName: string;
    requesterUserId: string;
    requesterEmail?: string | null;
    proposed: Partial<BankAccountSnapshot>;
  }) {
    const proposed = requireAccount(input.proposed, 'Proposed account');
    const current = await this.store.approvedFor(input.entityType, input.entityId);
    const pending = (await this.store.list({ entityType: input.entityType, entityId: input.entityId })).filter((row) =>
      ['PENDING_REVIEW', 'PENDING_NAME_VERIFICATION', 'REQUIRES_MANUAL_REVIEW'].includes(row.status),
    );
    if (pending.some((row) => row.proposedAccount.accountNumber === proposed.accountNumber)) {
      throw Object.assign(new Error('A matching bank account update is already pending review.'), { status: 409, code: 'DUPLICATE_BANK_REQUEST' });
    }
    const nameMatch = matchBusinessName(input.entityName, proposed.accountName);
    const now = new Date().toISOString();
    const row: BankAccountUpdateRequest = {
      id: randomUUID(),
      entityType: input.entityType,
      entityId: input.entityId,
      entityName: input.entityName,
      requesterUserId: input.requesterUserId,
      requesterEmail: input.requesterEmail || null,
      currentAccount: current,
      proposedAccount: proposed,
      nameMatch,
      status: nameMatch.decision,
      createdAt: now,
      updatedAt: now,
      audit: [{ at: now, actorId: input.requesterUserId, action: 'SUBMITTED', detail: nameMatch.reviewReason }],
    };
    await this.store.insert(row);
    return publicBankView(row);
  }

  async decide(input: {
    id: string;
    actorId: string;
    action: 'APPROVE' | 'REJECT' | 'REQUEST_VERIFICATION';
    reason?: string;
  }) {
    const row = await this.store.get(input.id);
    if (!row) throw Object.assign(new Error('Bank account update request was not found.'), { status: 404 });
    if (row.requesterUserId && row.requesterUserId === input.actorId) {
      throw Object.assign(new Error('The requester cannot approve or reject their own bank account update.'), {
        status: 403,
        code: 'MAKER_CANNOT_APPROVE',
      });
    }
    if (['APPROVED', 'REJECTED', 'SUPERSEDED'].includes(row.status)) {
      throw Object.assign(new Error(`Request is already ${row.status}.`), { status: 409 });
    }
    const now = new Date().toISOString();
    if (input.action === 'REJECT') {
      const reason = String(input.reason || '').trim();
      if (reason.length < 5) {
        throw Object.assign(new Error('Rejection requires a reason of at least 5 characters.'), { status: 400 });
      }
      row.status = 'REJECTED';
      row.rejectionReason = reason;
      row.reviewedBy = input.actorId;
      row.reviewedAt = now;
      row.updatedAt = now;
      row.audit.push({ at: now, actorId: input.actorId, action: 'REJECTED', detail: reason });
      await this.store.update(row);
      return publicBankView(row);
    }
    if (input.action === 'REQUEST_VERIFICATION') {
      row.status = 'PENDING_NAME_VERIFICATION';
      row.updatedAt = now;
      row.audit.push({ at: now, actorId: input.actorId, action: 'REQUEST_VERIFICATION', detail: input.reason || '' });
      await this.store.update(row);
      return publicBankView(row);
    }
    const previous = (await this.store.list({ entityType: row.entityType, entityId: row.entityId })).filter(
      (item) => item.id !== row.id && item.status === 'APPROVED',
    );
    for (const old of previous) {
      old.status = 'SUPERSEDED';
      old.updatedAt = now;
      old.audit.push({ at: now, actorId: input.actorId, action: 'SUPERSEDED', detail: `Replaced by ${row.id}` });
      await this.store.update(old);
    }
    row.status = 'APPROVED';
    row.reviewedBy = input.actorId;
    row.reviewedAt = now;
    row.updatedAt = now;
    row.audit.push({ at: now, actorId: input.actorId, action: 'APPROVED' });
    await this.store.update(row);
    return publicBankView(row);
  }
}

export const memoryBankAccountStore = new MemoryBankAccountStore();
export const bankAccountGovernanceService = new BankAccountGovernanceService(memoryBankAccountStore);

export function createBankAccountGovernanceService(store?: BankAccountStore) {
  return new BankAccountGovernanceService(store || memoryBankAccountStore);
}
