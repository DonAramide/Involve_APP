const TERMII_URL = 'https://api.ng.termii.com/api/sms/send';

/** Nigerian numbers become 234… so Termii can accept them. Returns null when unusable. */
export function normalizeSmsPhone(value: unknown): string | null {
  let digits = String(value || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('234') && digits.length >= 12) {
    // already international
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = `234${digits.slice(1)}`;
  } else if (digits.length === 10) {
    digits = `234${digits}`;
  }
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export function smsIsConfigured(): boolean {
  return String(process.env.TERMII_API_KEY || '').trim().length > 0;
}

export async function sendPlainSms(
  to: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = String(process.env.TERMII_API_KEY || '').trim();
  if (!apiKey) {
    return { ok: false, error: 'SMS is not configured on this server.' };
  }
  const phone = normalizeSmsPhone(to);
  if (!phone) {
    return { ok: false, error: 'That phone number cannot receive SMS.' };
  }

  const sender = String(process.env.TERMII_SENDER_ID || 'N-Alert').trim() || 'N-Alert';
  const channel = String(process.env.TERMII_CHANNEL || 'generic').trim() || 'generic';

  try {
    const response = await fetch(TERMII_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: phone,
        from: sender,
        sms: message,
        type: 'plain',
        channel,
        api_key: apiKey,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const reason = String((data as any)?.message || `SMS provider returned ${response.status}`);
      return { ok: false, error: reason.slice(0, 180) };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: 'SMS could not be sent.' };
  }
}
