// invify-backend/src/controllers/support.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import * as fs from 'fs';
import * as path from 'path';

const LOCAL_DB_PATH = path.join(process.cwd(), 'complaints_db.json');

function getLocalDB() {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      const initial = { complaints: [] };
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initial, null, 2));
      return initial;
    }
    return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
  } catch (_) {
    return { complaints: [] };
  }
}

function saveLocalDB(data: any) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
}

function isOfflineMode(): boolean {
  return process.env.OFFLINE_MOCK_AUTH === 'true';
}

export class SupportController {
  /**
   * POST /api/mobile/complaints
   * Submit a new complaint from mobile app
   */
  static async createComplaint(req: Request, res: Response) {
    try {
      const { title, description, category, urgency, tenant_id, tenant_name, device_id, incident_date, attachment_url } = req.body;
      const newComplaint = {
        id: `comp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title,
        description,
        category: category || 'general',
        urgency: urgency || 'normal',
        status: 'pending',
        tenant_id: tenant_id || 'unknown',
        tenant_name: tenant_name || 'Unknown Tenant',
        device_id: device_id || null,
        incident_date: incident_date || null,
        attachment_url: attachment_url || null,
        created_at: new Date().toISOString()
      };

      if (isOfflineMode()) {
        const db = getLocalDB();
        db.complaints.unshift(newComplaint);
        saveLocalDB(db);
        return res.status(201).json({ success: true, data: newComplaint });
      }

      // Supabase
      const { data, error } = await supabase.from('complaints').insert([newComplaint]).select().single();
      if (error) {
        // fallback
        const db = getLocalDB();
        db.complaints.unshift(newComplaint);
        saveLocalDB(db);
        return res.status(201).json({ success: true, data: newComplaint });
      }

      return res.status(201).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/admin/complaints
   * List all complaints for Web Admin
   */
  static async listComplaints(req: Request, res: Response) {
    if (isOfflineMode()) {
      return res.json({ success: true, data: getLocalDB().complaints });
    }

    try {
      const { data, error } = await supabase.from('complaints').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.json({ success: true, data: getLocalDB().complaints });
    }
  }

  /**
   * GET /api/mobile/complaints
   * Get complaints for the specific tenant/device
   */
  static async getMobileComplaints(req: Request, res: Response) {
    const tenantId = req.query.tenant_id as string;
    const deviceId = req.query.device_id as string;
    if (isOfflineMode()) {
       const db = getLocalDB();
       return res.json({ success: true, data: db.complaints.filter((c: any) => c.tenant_id === tenantId || c.device_id === deviceId) });
    }
    try {
      let query = supabase.from('complaints').select('*').order('created_at', { ascending: false });
      if (tenantId && deviceId) {
        query = query.or(`tenant_id.eq.${tenantId},device_id.eq.${deviceId}`);
      } else if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      } else if (deviceId) {
        query = query.eq('device_id', deviceId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return res.json({ success: true, data });
    } catch(err: any) {
       return res.json({ success: true, data: getLocalDB().complaints.filter((c: any) => c.tenant_id === tenantId || c.device_id === deviceId) });
    }
  }

  /**
   * PATCH /api/admin/complaints/:id/status
   */
  static async updateComplaintStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { status } = req.body;

    if (isOfflineMode()) {
      const db = getLocalDB();
      const comp = db.complaints.find((c: any) => c.id === id);
      if (comp) comp.status = status;
      saveLocalDB(db);
      return res.json({ success: true, data: comp });
    }

    try {
      const { data, error } = await supabase.from('complaints').update({ status }).eq('id', id).select().single();
      if (error) throw error;
      return res.json({ success: true, data });
    } catch (err: any) {
      const db = getLocalDB();
      const comp = db.complaints.find((c: any) => c.id === id);
      if (comp) comp.status = status;
      saveLocalDB(db);
      return res.json({ success: true, data: comp });
    }
  }
}
