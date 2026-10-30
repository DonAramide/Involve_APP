export declare function defaultRequiredChannels(): string[];
export declare function sanitizeRequiredChannels(raw: unknown): string[];
export declare function isWhatsAppVerificationRequired(channels: string[]): boolean;
export declare function isEmailVerificationRequired(channels: string[]): boolean;
export declare function effectiveOnboardingChannels(channels: string[]): string[];
export declare function loadRequiredOnboardingChannels(): Promise<string[]>;
export declare function resolveOnboardingVerification(): Promise<{
    requiredChannels: string[];
    emailVerificationRequired: boolean;
    whatsappVerificationRequired: boolean;
}>;
