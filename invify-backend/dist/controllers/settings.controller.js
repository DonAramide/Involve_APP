"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsController = void 0;
const supabase_1 = require("../db/supabase");
class SettingsController {
    static async getOnboardingSettings(req, res) {
        try {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('onboarding_settings')
                .select('required_channels')
                .eq('id', 1)
                .single();
            if (error || !data) {
                // Fallback defaults if the table isn't seeded or has an error
                res.status(200).json({ requiredChannels: ['EMAIL'] });
                return;
            }
            res.status(200).json({ requiredChannels: data.required_channels || [] });
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
            const { data, error } = await supabase_1.supabaseAdmin
                .from('onboarding_settings')
                .update({
                required_channels: requiredChannels,
                updated_at: new Date().toISOString()
            })
                .eq('id', 1)
                .select()
                .single();
            if (error) {
                throw error;
            }
            res.status(200).json({ requiredChannels: data.required_channels });
        }
        catch (error) {
            console.error('[SettingsController] updateOnboardingSettings error:', error.message);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.SettingsController = SettingsController;
//# sourceMappingURL=settings.controller.js.map