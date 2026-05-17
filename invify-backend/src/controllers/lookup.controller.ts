import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const LOCAL_LOOKUP_DB_PATH = path.join(process.cwd(), 'lookup_db.json');

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

export class LookupController {
  private static initLocalDB() {
    if (!fs.existsSync(LOCAL_LOOKUP_DB_PATH)) {
      const initialData: LookupData = {
        gateways: [
          { id: 'stripe', label: 'Stripe Global', icon: 'credit_card' },
          { id: 'paystack', label: 'Paystack Africa', icon: 'account_balance' },
          { id: 'flutterwave', label: 'Flutterwave Web', icon: 'payments' }
        ],
        industries: [
          { id: 'school', label: 'School & Academy', icon: 'school', desc: 'Tuition structures, curriculums, lesson notes database, class logs.' },
          { id: 'retail', label: 'Retail & POS Stock', icon: 'shopping_cart', desc: 'Point of sale checkout speeds, inventory, depletion alerts.' },
          { id: 'hospitality', label: 'Hospitality Room', icon: 'hotel', desc: 'Booking calendars, room reserves, occupancy, billing logs.' }
        ]
      };
      fs.writeFileSync(LOCAL_LOOKUP_DB_PATH, JSON.stringify(initialData, null, 2));
    }
  }

  private static getLocalData(): LookupData {
    LookupController.initLocalDB();
    try {
      return JSON.parse(fs.readFileSync(LOCAL_LOOKUP_DB_PATH, 'utf-8'));
    } catch (_) {
      return { gateways: [], industries: [] };
    }
  }

  private static saveLocalData(data: LookupData) {
    fs.writeFileSync(LOCAL_LOOKUP_DB_PATH, JSON.stringify(data, null, 2));
  }

  /**
   * GET /public/lookup
   * Returns all system lookup datasets.
   */
  static getLookup(req: Request, res: Response) {
    try {
      const data = LookupController.getLocalData();
      return res.status(200).json(data);
    } catch (error: any) {
      console.error('[LookupController] getLookup Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /admin/lookup
   * Saves updated system lookup datasets.
   */
  static saveLookup(req: Request, res: Response) {
    try {
      const { gateways, industries } = req.body;
      if (!gateways || !industries) {
        return res.status(400).json({ error: 'Gateways and Industries datasets are required.' });
      }

      const updatedData: LookupData = { gateways, industries };
      LookupController.saveLocalData(updatedData);

      console.log('[LookupController] Super Admin lookup configuration updated successfully.');
      return res.status(200).json({ message: 'Lookup data saved successfully.', data: updatedData });
    } catch (error: any) {
      console.error('[LookupController] saveLookup Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }
}
