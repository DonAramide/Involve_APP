import {
  defaultRequiredChannels,
  effectiveOnboardingChannels,
  isEmailVerificationRequired,
  isWhatsAppVerificationRequired,
  sanitizeRequiredChannels,
} from '../src/services/onboarding-settings.service';

describe('onboarding settings — WhatsApp default off, server-configurable', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    delete process.env.AUTH_WHATSAPP_VERIFICATION_REQUIRED;
    delete process.env.AUTH_EMAIL_VERIFICATION_REQUIRED;
  });

  test('default channels are email only', () => {
    expect(defaultRequiredChannels()).toEqual(['EMAIL']);
    expect(isWhatsAppVerificationRequired(defaultRequiredChannels())).toBe(false);
    expect(isEmailVerificationRequired(defaultRequiredChannels())).toBe(true);
  });

  test('WhatsApp is off unless DB includes WHATSAPP or env is true', () => {
    delete process.env.AUTH_WHATSAPP_VERIFICATION_REQUIRED;
    expect(isWhatsAppVerificationRequired(['EMAIL'])).toBe(false);
    expect(isWhatsAppVerificationRequired(['EMAIL', 'WHATSAPP'])).toBe(true);

    process.env.AUTH_WHATSAPP_VERIFICATION_REQUIRED = 'true';
    expect(isWhatsAppVerificationRequired(['EMAIL'])).toBe(true);
  });

  test('effective channels expose WhatsApp only when required', () => {
    delete process.env.AUTH_WHATSAPP_VERIFICATION_REQUIRED;
    expect(effectiveOnboardingChannels(['EMAIL'])).toEqual(['EMAIL']);

    process.env.AUTH_WHATSAPP_VERIFICATION_REQUIRED = 'true';
    expect(effectiveOnboardingChannels(['EMAIL'])).toEqual(['EMAIL', 'WHATSAPP']);
  });

  test('sanitize drops unknown channels and falls back when payload is invalid', () => {
    expect(sanitizeRequiredChannels(['EMAIL', 'SMS', 'whatsapp'])).toEqual(['EMAIL', 'WHATSAPP']);
    expect(sanitizeRequiredChannels(null)).toEqual(['EMAIL']);
  });
});
