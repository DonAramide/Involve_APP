"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRequiredChannels = defaultRequiredChannels;
exports.sanitizeRequiredChannels = sanitizeRequiredChannels;
exports.isWhatsAppVerificationRequired = isWhatsAppVerificationRequired;
exports.isEmailVerificationRequired = isEmailVerificationRequired;
exports.effectiveOnboardingChannels = effectiveOnboardingChannels;
exports.loadRequiredOnboardingChannels = loadRequiredOnboardingChannels;
exports.resolveOnboardingVerification = resolveOnboardingVerification;
const supabase_1 = require("../db/supabase");
const ALLOWED_CHANNELS = new Set(['EMAIL', 'WHATSAPP']);
function defaultRequiredChannels() {
    return ['EMAIL'];
}
function sanitizeRequiredChannels(raw) {
    if (!Array.isArray(raw))
        return defaultRequiredChannels();
    const channels = raw
        .map((value) => String(value || '').trim().toUpperCase())
        .filter((value) => ALLOWED_CHANNELS.has(value));
    return channels;
}
function isWhatsAppVerificationRequired(channels) {
    if (process.env.AUTH_WHATSAPP_VERIFICATION_REQUIRED === 'true')
        return true;
    return channels.includes('WHATSAPP');
}
function isEmailVerificationRequired(channels) {
    if (process.env.AUTH_EMAIL_VERIFICATION_REQUIRED === 'false')
        return false;
    if (!channels.length)
        return true;
    return channels.includes('EMAIL');
}
function effectiveOnboardingChannels(channels) {
    const next = [];
    if (isEmailVerificationRequired(channels))
        next.push('EMAIL');
    if (isWhatsAppVerificationRequired(channels))
        next.push('WHATSAPP');
    return next;
}
async function loadRequiredOnboardingChannels() {
    try {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('onboarding_settings')
            .select('required_channels')
            .eq('id', 1)
            .single();
        if (error || !data) {
            return defaultRequiredChannels();
        }
        return sanitizeRequiredChannels(data.required_channels);
    }
    catch {
        return defaultRequiredChannels();
    }
}
async function resolveOnboardingVerification() {
    const channels = effectiveOnboardingChannels(await loadRequiredOnboardingChannels());
    return {
        requiredChannels: channels,
        emailVerificationRequired: isEmailVerificationRequired(channels),
        whatsappVerificationRequired: isWhatsAppVerificationRequired(channels),
    };
}
//# sourceMappingURL=onboarding-settings.service.js.map