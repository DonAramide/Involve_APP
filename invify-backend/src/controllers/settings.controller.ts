import { Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase';

export class SettingsController {
  public static async getOnboardingSettings(req: Request, res: Response): Promise<void> {
    try {
      const { data, error } = await supabaseAdmin
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

      const { data, error } = await supabaseAdmin
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
    } catch (error: any) {
      console.error('[SettingsController] updateOnboardingSettings error:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
