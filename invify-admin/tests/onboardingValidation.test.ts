import {
  emailRule,
  isValidEmail,
  isValidAfricanMobile,
  passwordRule,
  buildE164,
} from '../src/utils/onboardingValidation';
import {
  defaultOnboardingChannels,
  emailVerificationRequired,
  whatsappVerificationRequired,
} from '../src/utils/onboardingChannels';

describe('onboardingValidation', () => {
  test('rejects incomplete emails', () => {
    expect(isValidEmail('kelvinnwosu441@yahoo')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('name@company.com')).toBe(true);
  });

  test('requires Nigerian 10-digit mobiles starting 7/8/9', () => {
    expect(isValidAfricanMobile('+234', '8012345678')).toBe(true);
    expect(isValidAfricanMobile('+234', '08012345678')).toBe(true);
    expect(isValidAfricanMobile('+234', '12345')).toBe(false);
    expect(buildE164('+234', '08012345678')).toBe('+2348012345678');
  });

  test('password must be at least 6 characters', () => {
    expect(passwordRule('12345')).not.toBe(true);
    expect(passwordRule('123456')).toBe(true);
  });

  test('emailRule surfaces a useful message', () => {
    expect(emailRule('bad@x')).not.toBe(true);
  });
});

describe('onboardingChannels', () => {
  test('WhatsApp verification is off by default', () => {
    expect(defaultOnboardingChannels()).toEqual(['EMAIL']);
    expect(whatsappVerificationRequired(defaultOnboardingChannels())).toBe(false);
    expect(emailVerificationRequired(defaultOnboardingChannels())).toBe(true);
  });

  test('WhatsApp is required only when the server includes WHATSAPP', () => {
    expect(whatsappVerificationRequired(['EMAIL'])).toBe(false);
    expect(whatsappVerificationRequired(['EMAIL', 'WHATSAPP'])).toBe(true);
    expect(whatsappVerificationRequired(undefined)).toBe(false);
  });
});
