import { createHash } from 'crypto';

const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Strip to uppercase A-Z0-9 only. */
export function alnumUpper(value: string): string {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Stable 3-character organisation prefix from the registered name.
 * Prefer meaningful initials; pad/hash if the name is short.
 */
export function deriveOrgPrefix(organizationName: string): string {
  const cleaned = alnumUpper(organizationName);
  if (cleaned.length >= 3) {
    const words = String(organizationName || '')
      .trim()
      .split(/\s+/)
      .map((w) => alnumUpper(w))
      .filter(Boolean);
    if (words.length >= 3) {
      return (words[0][0] + words[1][0] + words[2][0]).slice(0, 3);
    }
    if (words.length === 2 && words[0].length && words[1].length) {
      const a = words[0][0];
      const b = words[1][0];
      const c = words[1][1] || words[0][1] || 'X';
      return (a + b + c).slice(0, 3);
    }
    return cleaned.slice(0, 3);
  }
  const seed = createHash('sha256').update(organizationName || 'ORG').digest('hex').toUpperCase();
  return (cleaned + seed).replace(/[^A-Z0-9]/g, '').slice(0, 3).padEnd(3, 'X');
}

/** Deterministic alternate prefixes when uniqueness fails. */
export function alternateOrgPrefix(base: string, attempt: number): string {
  const b = alnumUpper(base).slice(0, 3).padEnd(3, 'X');
  if (attempt <= 0) return b;
  const ch = ALNUM[attempt % ALNUM.length];
  return (b.slice(0, 2) + ch).slice(0, 3);
}

/**
 * 3-char name abbreviation from beneficiary full name (first letters / first name).
 */
export function deriveNameAbbrev(fullName: string): string {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .map((p) => alnumUpper(p))
    .filter(Boolean);
  if (parts.length === 0) return 'XXX';
  if (parts.length === 1) return parts[0].slice(0, 3).padEnd(3, 'X');
  if (parts.length === 2) {
    return (parts[0][0] + parts[1].slice(0, 2)).slice(0, 3).padEnd(3, 'X');
  }
  return (parts[0][0] + parts[1][0] + parts[2][0]).slice(0, 3);
}

/**
 * 6-char stable suffix from admission/staff code + subject id (collision-safe, not row order).
 * Does not change when the person renames.
 */
export function derivePersonSuffix6(printedCode: string, subjectId: string): string {
  const fromCode = alnumUpper(printedCode).replace(/^0+/, '') || alnumUpper(printedCode);
  if (/^[A-Z0-9]{6}$/.test(fromCode.slice(-6)) && fromCode.length >= 6) {
    return fromCode.slice(-6);
  }
  if (/^\d+$/.test(fromCode) && fromCode.length > 0) {
    return fromCode.slice(-6).padStart(6, '0');
  }
  const digest = createHash('sha256')
    .update(`${printedCode || ''}|${subjectId || ''}`)
    .digest('hex')
    .toUpperCase();
  // Map hex to A-Z0-9 length 6
  let out = '';
  for (let i = 0; i < digest.length && out.length < 6; i += 1) {
    const n = parseInt(digest[i], 16);
    out += ALNUM[n % ALNUM.length];
  }
  return out.padEnd(6, '0').slice(0, 6);
}

/** 9-char beneficiary segment: 3 name + 6 stable id. */
export function deriveBeneficiaryNine(fullName: string, printedCode: string, subjectId: string): string {
  return (deriveNameAbbrev(fullName) + derivePersonSuffix6(printedCode, subjectId)).slice(0, 9);
}

/** Full 12-char Invify identity code. */
export function buildInvifyCode(orgPrefix: string, beneficiaryNine: string): string {
  const org = alnumUpper(orgPrefix).slice(0, 3).padEnd(3, 'X');
  const nine = alnumUpper(beneficiaryNine).slice(0, 9).padEnd(9, 'X');
  return (org + nine).slice(0, 12);
}

export function isInvifyCode(raw: unknown): raw is string {
  return typeof raw === 'string' && /^[A-Z0-9]{12}$/.test(raw.trim().toUpperCase());
}

export function normalizeInvifyCode(raw: string): string {
  return alnumUpper(raw).slice(0, 12);
}
