"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsController = void 0;
const supabase_1 = require("../db/supabase");
const onboarding_settings_service_1 = require("../services/onboarding-settings.service");
class SettingsController {
    static async getOnboardingSettings(req, res) {
        try {
            const settings = await (0, onboarding_settings_service_1.resolveOnboardingVerification)();
            res.status(200).json(settings);
        }
        catch (error) {
            console.error('[SettingsController] getOnboardingSettings error:', error.message);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async updateOnboardingSettings(req, res) {
        try {
            const { requiredChannels } = req.body;
            if (!Array.isArray(requiredChannels)) {
                res.status(400).json({ error: 'requiredChannels must be an array' });
                return;
            }
            const sanitized = (0, onboarding_settings_service_1.sanitizeRequiredChannels)(requiredChannels);
            const { error } = await supabase_1.supabaseAdmin
                .from('onboarding_settings')
                .upsert({
                id: 1,
                required_channels: sanitized,
                updated_at: new Date().toISOString()
            });
            if (error) {
                throw error;
            }
            const settings = await (0, onboarding_settings_service_1.resolveOnboardingVerification)();
            res.status(200).json(settings);
        }
        catch (error) {
            console.error('[SettingsController] updateOnboardingSettings error:', error.message);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.SettingsController = SettingsController;
//# sourceMappingURL=settings.controller.js.map