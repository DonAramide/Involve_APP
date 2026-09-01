export const PASSWORD_MIN_LENGTH = 9;

export interface PasswordPolicyOptions {
  email?: string;
  currentPassword?: string;
}

export interface PasswordPolicyResult {
  ok: boolean;
  errors: string[];
  checks: {
    minLength: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
    notWeak: boolean;
    notRepeated: boolean;
    notCurrent: boolean;
  };
}

const WEAK_WORDS = [
  'password',
  'passw0rd',
  'welcome',
  'invify',
  'admin',
  'qwerty',
  'letmein',
  'iloveyou',
  'monkey',
  'dragon',
  'master',
  'login',
  'abc123',
  '123456',
  '111111',
  '000000',
  'baseball',
  'football',
  'shadow',
  'sunshine',
];

function normalizeLeet(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/[1!]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/5/g, 's')
    .replace(/7/g, 't');
}

function hasRepeatedOrSequentialPattern(password: string): boolean {
  if (/(.)\1{2,}/.test(password)) return true;

  const repeatBlock = password.match(/(.{2,5})\1+/);
  if (repeatBlock && repeatBlock[0].length >= 6) return true;

  const compact = password.toLowerCase();
  const sequences = [
    '0123456789',
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
  ];
  for (const seq of sequences) {
    for (let i = 0; i <= seq.length - 4; i += 1) {
      const slice = seq.slice(i, i + 4);
      const reversed = [...slice].reverse().join('');
      if (compact.includes(slice) || compact.includes(reversed)) return true;
    }
  }
  return false;
}

function containsWeakWord(password: string, email?: string): boolean {
  const normalized = normalizeLeet(password).replace(/[^a-z0-9]/g, '');
  if (WEAK_WORDS.some((word) => normalized.includes(word))) return true;

  const local = String(email || '')
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (local.length >= 4 && normalized.includes(local)) return true;
  return false;
}

export function evaluatePasswordPolicy(
  password: string,
  options: PasswordPolicyOptions = {},
): PasswordPolicyResult {
  const value = String(password || '');
  const checks = {
    minLength: value.length >= PASSWORD_MIN_LENGTH,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /[0-9]/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
    notWeak: !containsWeakWord(value, options.email),
    notRepeated: !hasRepeatedOrSequentialPattern(value),
    notCurrent: !options.currentPassword || value !== options.currentPassword,
  };

  const errors: string[] = [];
  if (!checks.minLength) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (!checks.uppercase || !checks.lowercase || !checks.number || !checks.special) {
    errors.push('Use an uppercase letter, a lowercase letter, a number, and a special character.');
  }
  if (!checks.notWeak) {
    errors.push('That password is too easy to guess. Avoid common words, your name, or your email.');
  }
  if (!checks.notRepeated) {
    errors.push('Avoid repeated or sequential patterns such as aaa, 1234, or ababab.');
  }
  if (!checks.notCurrent) {
    errors.push('New password cannot be the same as your current or default password.');
  }

  return { ok: errors.length === 0, errors, checks };
}

export function assertPasswordPolicy(
  password: string,
  options: PasswordPolicyOptions = {},
): PasswordPolicyResult {
  return evaluatePasswordPolicy(password, options);
}
