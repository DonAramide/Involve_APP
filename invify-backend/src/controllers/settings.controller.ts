import { Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase';
import {
  resolveOnboardingVerification,
  sanitizeRequiredChannels,
} from '../services/onboarding-settings.service';

export class SettingsController {
  public static async getOnboardingSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await resolveOnboardingVerification();
      res.status(200).json(settings);
    } catch (error: any) {
      console.error('[SettingsController] getOnboardingSettings error:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public static async updateOnboardingSettings(req: Request, res: Response): Promise<void> {
    try {
      const { requiredChannels } = req.body;

      if (!Array.isArray(requiredChannels)) {
        res.status(400).json({ error: 'requiredChannels must be an array' });
        return;
      }

      const sanitized = sanitizeRequiredChannels(requiredChannels);

      const { error } = await supabaseAdmin
        .from('onboarding_settings')
        .upsert({
          id: 1,
          required_channels: sanitized,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      const settings = await resolveOnboardingVerification();
      res.status(200).json(settings);
    } catch (error: any) {
      console.error('[SettingsController] updateOnboardingSettings error:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
