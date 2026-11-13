import { supabaseAdmin } from '../../db/supabase';
import {
  BankAccountSnapshot,
  BankAccountStore,
  BankAccountUpdateRequest,
  BankEntityType,
  BankRequestStatus,
} from './bank-account-governance.service';

function asAccount(
  code?: string | null,
  name?: string | null,
  number?: string | null,
  accountName?: string | null,
): BankAccountSnapshot | null {
  if (!code && !number && !accountName) return null;
  return {
    bankCode: String(code || ''),
    bankName: String(name || code || ''),
    accountNumber: String(number || ''),
    accountName: String(accountName || ''),
  };
}

function fromRow(row: any): BankAccountUpdateRequest {
  const matched = Array.isArray(row.matched_tokens) ? row.matched_tokens : [];
  const unmatched = Array.isArray(row.unmatched_tokens) ? row.unmatched_tokens : [];
  return {
    id: String(row.id),
    entityType: row.entity_type,
    entityId: String(row.entity_id),
    entityName: row.entity_name,
    requesterUserId: String(row.requester_user_id),
    requesterEmail: row.requester_email || null,
    currentAccount: asAccount(
      row.current_bank_code,
      row.current_bank_name,
      row.current_account_number,
      row.current_account_name,
    ),
    proposedAccount: asAccount(
      row.proposed_bank_code,
      row.proposed_bank_name,
      row.proposed_account_number,
      row.proposed_account_name,
    ) as BankAccountSnapshot,
    nameMatch: {
      registeredName: row.entity_name,
      accountName: row.proposed_account_name,
      normalizedRegistered: '',
      normalizedAccount: '',
      registeredTokens: [],
      accountTokens: [],
      matchedTokens: matched,
      unmatchedRegisteredTokens: [],
      unmatchedAccountTokens: unmatched,
      matchCount: matched.length,
      scoreBps: Number(row.match_score_bps || 0),
      decision: row.match_decision,
      reviewReason: row.review_reason || '',
      autoApprove: false,
    },
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedBy: row.reviewed_by || null,
    reviewedAt: row.reviewed_at || null,
    rejectionReason: row.rejection_reason || null,
    audit: Array.isArray(row.audit) ? row.audit : [],
  };
}

function toRow(row: BankAccountUpdateRequest) {
  return {
    id: row.id,
    entity_type: row.entityType,
    entity_id: row.entityId,
    entity_name: row.entityName,
    requester_user_id: row.requesterUserId,
    requester_email: row.requesterEmail || null,
    current_bank_code: row.currentAccount?.bankCode || null,
    current_bank_name: row.currentAccount?.bankName || null,
    current_account_number: row.currentAccount?.accountNumber || null,
    current_account_name: row.currentAccount?.accountName || null,
    proposed_bank_code: row.proposedAccount.bankCode,
    proposed_bank_name: row.proposedAccount.bankName,
    proposed_account_number: row.proposedAccount.accountNumber,
    proposed_account_name: row.proposedAccount.accountName,
    match_score_bps: row.nameMatch.scoreBps,
    matched_tokens: row.nameMatch.matchedTokens,
    unmatched_tokens: row.nameMatch.unmatchedAccountTokens,
    match_decision: row.nameMatch.decision,
    review_reason: row.nameMatch.reviewReason,
    status: row.status,
    rejection_reason: row.rejectionReason || null,
    reviewed_by: row.reviewedBy || null,
    reviewed_at: row.reviewedAt || null,
    audit: row.audit,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export class SupabaseBankAccountStore implements BankAccountStore {
  async list(filter?: { entityType?: BankEntityType; status?: BankRequestStatus | 'ALL'; entityId?: string }) {
    let query = supabaseAdmin.from('bank_account_update_requests').select('*').order('created_at', { ascending: false });
    if (filter?.entityType) query = query.eq('entity_type', filter.entityType);
    if (filter?.entityId) query = query.eq('entity_id', filter.entityId);
    if (filter?.status && filter.status !== 'ALL') query = query.eq('status', filter.status);
    const { data, error } = await query.limit(500);
    if (error) throw Object.assign(new Error(error.message), { status: 500, code: 'BANK_ACCOUNT_STORE' });
    return (data || []).map(fromRow);
  }

  async get(id: string) {
    const { data, error } = await supabaseAdmin.from('bank_account_update_requests').select('*').eq('id', id).maybeSingle();
    if (error) throw Object.assign(new Error(error.message), { status: 500, code: 'BANK_ACCOUNT_STORE' });
    return data ? fromRow(data) : null;
  }

  async insert(row: BankAccountUpdateRequest) {
    const { error } = await supabaseAdmin.from('bank_account_update_requests').insert(toRow(row));
    if (error) throw Object.assign(new Error(error.message), { status: 500, code: 'BANK_ACCOUNT_STORE' });
    return row;
  }

  async update(row: BankAccountUpdateRequest) {
    const { error } = await supabaseAdmin.from('bank_account_update_requests').update(toRow(row)).eq('id', row.id);
    if (error) throw Object.assign(new Error(error.message), { status: 500, code: 'BANK_ACCOUNT_STORE' });
    return row;
  }

  async approvedFor(entityType: BankEntityType, entityId: string) {
    const { data, error } = await supabaseAdmin
      .from('bank_account_update_requests')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('status', 'APPROVED')
      .order('reviewed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw Object.assign(new Error(error.message), { status: 500, code: 'BANK_ACCOUNT_STORE' });
    return data ? fromRow(data).proposedAccount : null;
  }
}
