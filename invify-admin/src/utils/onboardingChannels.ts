export function defaultOnboardingChannels(): string[] {
  return ['EMAIL'];
}

export function emailVerificationRequired(requiredChannels: string[] | undefined | null): boolean {
  if (!Array.isArray(requiredChannels) || requiredChannels.length === 0) return true;
  return requiredChannels.includes('EMAIL');
}

export function whatsappVerificationRequired(requiredChannels: string[] | undefined | null): boolean {
  return Array.isArray(requiredChannels) && requiredChannels.includes('WHATSAPP');
}
