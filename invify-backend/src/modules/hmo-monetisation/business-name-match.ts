/**
 * Business-name matching for bank-account verification.
 * Never auto-approves. Produces evidence for Super Admin review.
 */

export type NameMatchDecision =
  | 'PENDING_REVIEW'
  | 'PENDING_NAME_VERIFICATION'
  | 'REQUIRES_MANUAL_REVIEW';

export interface NameMatchResult {
  registeredName: string;
  accountName: string;
  normalizedRegistered: string;
  normalizedAccount: string;
  registeredTokens: string[];
  accountTokens: string[];
  matchedTokens: string[];
  unmatchedRegisteredTokens: string[];
  unmatchedAccountTokens: string[];
  matchCount: number;
  scoreBps: number;
  decision: NameMatchDecision;
  reviewReason: string;
  autoApprove: false;
}

const LEGAL_SUFFIXES = new Set([
  'ltd',
  'limited',
  'plc',
  'company',
  'co',
  'inc',
  'incorporated',
  'llc',
  'corp',
  'corporation',
  'enterprises',
  'enterprise',
  'holdings',
  'holding',
  'nig',
  'nigeria',
]);

const STOPWORDS = new Set(['the', 'and', 'of', 'for', 'a', 'an', 'to', 'in', '&']);

export function normalizeBusinessName(raw: string): string {
  return String(raw || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeBusinessName(raw: string): string[] {
  const normalized = normalizeBusinessName(raw);
  if (!normalized) return [];
  return normalized
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
    .filter((token) => !LEGAL_SUFFIXES.has(token))
    .filter((token) => !STOPWORDS.has(token));
}

function tokensSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  if (a.length === b.length) {
    let drift = 0;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) drift += 1;
      if (drift > 1) return false;
    }
    return drift === 1;
  }
  return false;
}

function unique(tokens: string[]): string[] {
  return Array.from(new Set(tokens));
}

export function matchBusinessName(registeredName: string, accountName: string): NameMatchResult {
  const registeredTokens = unique(tokenizeBusinessName(registeredName));
  const accountTokens = unique(tokenizeBusinessName(accountName));
  const matchedTokens: string[] = [];
  const usedAccount = new Set<number>();

  for (const registered of registeredTokens) {
    const idx = accountTokens.findIndex((account, i) => !usedAccount.has(i) && tokensSimilar(registered, account));
    if (idx >= 0) {
      matchedTokens.push(registered);
      usedAccount.add(idx);
    }
  }

  const unmatchedRegisteredTokens = registeredTokens.filter((t) => !matchedTokens.includes(t));
  const unmatchedAccountTokens = accountTokens.filter((_, i) => !usedAccount.has(i));
  const matchCount = matchedTokens.length;
  const denom = Math.max(registeredTokens.length, 1);
  const scoreBps = Math.round((matchCount * 10_000) / denom);

  let decision: NameMatchDecision = 'REQUIRES_MANUAL_REVIEW';
  let reviewReason = 'Fewer than two meaningful business-name tokens match the bank account name.';

  if (registeredTokens.length < 2) {
    decision = 'REQUIRES_MANUAL_REVIEW';
    reviewReason = 'Registered business name has fewer than two meaningful tokens. Manual verification is required.';
  } else if (matchCount < 2) {
    decision = 'REQUIRES_MANUAL_REVIEW';
    reviewReason =
      matchCount === 0
        ? 'No meaningful business-name tokens match the bank account name.'
        : 'Only one meaningful business-name token matches the bank account name.';
  } else if (accountTokens.length < 3 && registeredTokens.length >= 3) {
    decision = 'REQUIRES_MANUAL_REVIEW';
    reviewReason =
      'Two tokens match but the proposed account name is too short relative to the registered name. Insufficient evidence for a settlement account.';
  } else if (unmatchedAccountTokens.length > 0 && matchCount === 2) {
    decision = 'PENDING_NAME_VERIFICATION';
    reviewReason = 'Partial token overlap. Super Admin must review unmatched account-name words before approval.';
  } else {
    decision = 'PENDING_REVIEW';
    reviewReason =
      matchCount >= registeredTokens.length
        ? 'Strong token overlap. Super Admin checker must still approve; matcher never auto-approves.'
        : 'At least two meaningful tokens match. Super Admin checker must still approve; matcher never auto-approves.';
  }

  return {
    registeredName: String(registeredName || ''),
    accountName: String(accountName || ''),
    normalizedRegistered: normalizeBusinessName(registeredName),
    normalizedAccount: normalizeBusinessName(accountName),
    registeredTokens,
    accountTokens,
    matchedTokens,
    unmatchedRegisteredTokens,
    unmatchedAccountTokens,
    matchCount,
    scoreBps,
    decision,
    reviewReason,
    autoApprove: false,
  };
}
