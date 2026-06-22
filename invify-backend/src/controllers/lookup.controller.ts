import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../db/supabase';
import { isMockAuthAllowed } from '../config/constants';

function isOfflineMode(): boolean {
  return isMockAuthAllowed();
}

interface LookupGateway {
  id: string;
  label: string;
  icon: string;
}

interface LookupIndustry {
  id: string;
  label: string;
  icon: string;
  desc: string;
}

interface LookupData {
  gateways: LookupGateway[];
  industries: LookupIndustry[];
}

const DEFAULT_LOOKUP_DATA: LookupData = {
  gateways: [
    { id: 'stripe', label: 'Stripe Global', icon: 'credit_card' },
    { id: 'paystack', label: 'Paystack Africa', icon: 'account_balance' },
    { id: 'flutterwave', label: 'Flutterwave Web', icon: 'payments' }
  ],
  industries: [
    { id: 'school', label: 'School & Academy', icon: 'school', desc: 'Tuition structures, curriculums, lesson notes database, class logs.' },
    { id: 'retail', label: 'Retail & POS Stock', icon: 'shopping_cart', desc: 'Point of sale checkout speeds, inventory, depletion alerts.' },
    { id: 'hospitality', label: 'Service Provider', icon: 'dry_cleaning', desc: 'Dry cleaners, tailors, salons, and all professionals rendering specialized services.' }
  ]
};

export class LookupController {
  private static cachedData: LookupData | null = null;
  private static cachedUpdatedAt: string | null = null;

  /**
   * GET /public/lookup
   * Returns all system lookup datasets.
   */
  static async getLookup(req: Request, res: Response) {
    if (isOfflineMode()) {
      return res.status(200).json(LookupController.cachedData || DEFAULT_LOOKUP_DATA);
    }

    try {
      // 1. Fetch latest updated_at timestamp (fast, index-backed)
      const { data: updatedData, error: utError } = await supabase
        .from('lookup_configs')
        .select('updated_at')
        .eq('id', 'global')
        .maybeSingle();

      if (utError) throw utError;

      const latestUpdatedAt = updatedData?.updated_at || null;

      // 2. Return cached config if it is still fresh
      if (LookupController.cachedData && LookupController.cachedUpdatedAt && latestUpdatedAt === LookupController.cachedUpdatedAt) {
        return res.status(200).json(LookupController.cachedData);
      }

      // 3. Otherwise query the full config
      const { data: fullData, error: fetchError } = await supabase
        .from('lookup_configs')
        .select('gateways, industries, updated_at')
        .eq('id', 'global')
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!fullData) {
        return res.status(200).json(DEFAULT_LOOKUP_DATA);
      }

      // 4. Update the in-memory cache
      LookupController.cachedData = {
        gateways: fullData.gateways,
        industries: fullData.industries
      };
      LookupController.cachedUpdatedAt = fullData.updated_at;

      return res.status(200).json(LookupController.cachedData);
    } catch (error: any) {
      console.error('[LookupController] getLookup Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /admin/lookup
   * Saves updated system lookup datasets.
   */
  static async saveLookup(req: Request, res: Response) {
    try {
      const { gateways, industries } = req.body;
      if (!gateways || !industries) {
        return res.status(400).json({ error: 'Gateways and Industries datasets are required.' });
      }

      // 1. Structural mutation protection: validate gateway and industry IDs
      const allowedGateways = ['stripe', 'paystack', 'flutterwave'];
      const allowedIndustries = ['school', 'retail', 'hospitality'];

      for (const gw of gateways) {
        if (!gw.id || !allowedGateways.includes(gw.id)) {
          return res.status(400).json({ error: `Unsupported gateway ID: ${gw.id}. Structural mutations are not permitted.` });
        }
      }

      for (const ind of industries) {
        if (!ind.id || !allowedIndustries.includes(ind.id)) {
          return res.status(400).json({ error: `Unsupported industry ID: ${ind.id}. Structural mutations are not permitted.` });
        }
      }

      const updatedData: LookupData = { gateways, industries };

      if (isOfflineMode()) {
        LookupController.cachedData = updatedData;
        LookupController.cachedUpdatedAt = new Date().toISOString();
        return res.status(200).json({ message: 'Lookup data saved successfully (Mock Mode).', data: updatedData });
      }

      // 2. Perform upsert/update using supabaseAdmin (service role to bypass write block RLS)
      const { data, error } = await supabaseAdmin
        .from('lookup_configs')
        .upsert({
          id: 'global',
          gateways,
          industries,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // 3. Immediately sync local cache
      LookupController.cachedData = {
        gateways: data.gateways,
        industries: data.industries
      };
      LookupController.cachedUpdatedAt = data.updated_at;

      console.log('[LookupController] Super Admin lookup configuration updated successfully.');
      return res.status(200).json({ message: 'Lookup data saved successfully.', data: LookupController.cachedData });
    } catch (error: any) {
      console.error('[LookupController] saveLookup Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }
}
