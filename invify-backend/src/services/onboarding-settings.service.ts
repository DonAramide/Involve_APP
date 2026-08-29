import { supabaseAdmin } from '../db/supabase';

const ALLOWED_CHANNELS = new Set(['EMAIL', 'WHATSAPP']);

export function defaultRequiredChannels(): string[] {
  return ['EMAIL'];
}

export function sanitizeRequiredChannels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return defaultRequiredChannels();
  const channels = raw
    .map((value) => String(value || '').trim().toUpperCase())
    .filter((value) => ALLOWED_CHANNELS.has(value));
  return channels;
}

export function isWhatsAppVerificationRequired(channels: string[]): boolean {
  if (process.env.AUTH_WHATSAPP_VERIFICATION_REQUIRED === 'true') return true;
  return channels.includes('WHATSAPP');
}

export function isEmailVerificationRequired(channels: string[]): boolean {
  if (process.env.AUTH_EMAIL_VERIFICATION_REQUIRED === 'false') return false;
  if (!channels.length) return true;
  return channels.includes('EMAIL');
}

export function effectiveOnboardingChannels(channels: string[]): string[] {
  const next: string[] = [];
  if (isEmailVerificationRequired(channels)) next.push('EMAIL');
  if (isWhatsAppVerificationRequired(channels)) next.push('WHATSAPP');
  return next;
}

export async function loadRequiredOnboardingChannels(): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('onboarding_settings')
      .select('required_channels')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return defaultRequiredChannels();
    }

    return sanitizeRequiredChannels(data.required_channels);
  } catch {
    return defaultRequiredChannels();
  }
}

export async function resolveOnboardingVerification(): Promise<{
  requiredChannels: string[];
  emailVerificationRequired: boolean;
  whatsappVerificationRequired: boolean;
}> {
  const channels = effectiveOnboardingChannels(await loadRequiredOnboardingChannels());
  return {
    requiredChannels: channels,
    emailVerificationRequired: isEmailVerificationRequired(channels),
    whatsappVerificationRequired: isWhatsAppVerificationRequired(channels),
  };
}
