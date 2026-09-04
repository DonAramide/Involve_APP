const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const MIN_PASSWORD_LENGTH = 9;

export function isValidEmail(value: string): boolean {
  const email = String(value || '').trim();
  if (!email || email.length > 254) return false;
  if (email.includes('..')) return false;
  if (!EMAIL_RE.test(email)) return false;
  const [, domain] = email.split('@');
  if (!domain || !domain.includes('.')) return false;
  const tld = domain.split('.').pop() || '';
  return tld.length >= 2;
}

export function emailRule(val: string): true | string {
  if (!String(val || '').trim()) return 'Email is required';
  if (!isValidEmail(val)) return 'Enter a valid email address (example: name@company.com)';
  return true;
}

/** National digits only, without country code. Leading 0 is stripped. */
export function normalizeNationalNumber(raw: string): string {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.replace(/^0+/, '');
  return digits;
}

export function buildE164(dialCode: string, nationalRaw: string): string {
  const dial = String(dialCode || '').trim();
  const national = normalizeNationalNumber(nationalRaw);
  if (!dial || !national) return '';
  return `${dial}${national}`;
}

export function isValidAfricanMobile(dialCode: string, nationalRaw: string): boolean {
  const e164 = buildE164(dialCode, nationalRaw);
  if (!/^\+[1-9]\d{8,14}$/.test(e164)) return false;
  const national = normalizeNationalNumber(nationalRaw);
  if (dialCode === '+234') {
    return national.length === 10 && /^[789]/.test(national);
  }
  return national.length >= 7 && national.length <= 11;
}

export function phoneRule(dialCode: string, nationalRaw: string): true | string {
  if (!normalizeNationalNumber(nationalRaw)) return 'Phone number is required';
  if (!isValidAfricanMobile(dialCode, nationalRaw)) {
    if (dialCode === '+234') {
      return 'Enter a valid Nigerian mobile number (10 digits, starting with 7, 8, or 9)';
    }
    return 'Enter a valid mobile number for the selected African country';
  }
  return true;
}

export function passwordRule(val: string): true | string {
  if (!val) return 'Password is required';
  if (val.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (!/[A-Z]/.test(val)) {
    return 'Password must contain at least one capital letter (A-Z)';
  }
  if (!/[0-9]/.test(val)) {
    return 'Password must contain at least one number (0-9)';
  }
  if (!/[^A-Za-z0-9]/.test(val)) {
    return 'Password must contain at least one symbol (!@#$%...)';
  }
  return true;
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
