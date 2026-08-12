import { NormalizedSettlementRow } from './settlement-template.types';

export interface MatchablePosAttempt {
  id: string;
  tenant_id: string;
  terminal_id: string | null;
  amount: number;
  status: string;
  settlement_status: string | null;
  rrn: string | null;
  stan: string | null;
  auth_code: string | null;
}

export function normalizeDbRrn(value: string | null | undefined): string | null {
  if (!value || value === 'N/A') return null;
  const id = String(value).trim().replace(/\s+/g, '');
  if (/^\d+$/.test(id)) return id.padStart(12, '0').slice(-12);
  return id.toUpperCase();
}

export function normalizeDbStan(value: string | null | undefined): string | null {
  if (!value || value === 'N/A') return null;
  const id = String(value).trim().replace(/\s+/g, '');
  if (/^\d+$/.test(id)) return id.padStart(6, '0').slice(-6);
  return id;
}

export function normalizeDbTerminal(value: string | null | undefined): string | null {
  if (!value) return null;
  return String(value).trim().toUpperCase();
}

export function amountsClose(a: number, b: number, tolerance = 0.02): boolean {
  return Math.abs(a - b) <= tolerance;
}

export function amountCandidates(amount: number): number[] {
  const values = [amount];
  if (amount >= 100) values.push(amount / 100);
  if (amount <= 100000) values.push(amount * 100);
  return [...new Set(values.map((v) => Math.round(v * 100) / 100))];
}

export function scoreSettlementMatch(
  row: NormalizedSettlementRow,
  attempt: MatchablePosAttempt,
): number {
  let score = 0;
  const attemptRrn = normalizeDbRrn(attempt.rrn);
  const attemptStan = normalizeDbStan(attempt.stan);
  const attemptTerminal = normalizeDbTerminal(attempt.terminal_id);

  if (row.rrn && attemptRrn && row.rrn === attemptRrn) score += 40;
  if (row.stan && attemptStan && row.stan === attemptStan) score += 25;
  if (row.terminalId && attemptTerminal && row.terminalId === attemptTerminal) score += 20;

  const attemptAmount = Number(attempt.amount || 0);
  if (row.amount > 0 && attemptAmount > 0) {
    for (const candidate of amountCandidates(row.amount)) {
      if (amountsClose(candidate, attemptAmount)) {
        score += 15;
        break;
      }
    }
  }

  if (row.authCode && attempt.auth_code && row.authCode === String(attempt.auth_code).trim()) {
    score += 10;
  }

  if (row.rrn && attemptRrn && row.rrn !== attemptRrn) return 0;
  if (row.stan && attemptStan && row.stan !== attemptStan) score -= 10;

  return score;
}

export function buildSettlementMatchReason(
  row: NormalizedSettlementRow,
  attempt: MatchablePosAttempt,
): string {
  const parts: string[] = [];
  const attemptRrn = normalizeDbRrn(attempt.rrn);
  const attemptStan = normalizeDbStan(attempt.stan);
  const attemptTerminal = normalizeDbTerminal(attempt.terminal_id);

  if (row.rrn && attemptRrn && row.rrn === attemptRrn) parts.push('RRN');
  if (row.stan && attemptStan && row.stan === attemptStan) parts.push('STAN');
  if (row.terminalId && attemptTerminal && row.terminalId === attemptTerminal) parts.push('Terminal');
  if (row.amount > 0 && amountsClose(row.amount, Number(attempt.amount || 0))) parts.push('Amount');

  return parts.length ? `Matched on ${parts.join(' + ')}` : 'Weak match';
}
