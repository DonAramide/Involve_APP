// invify-backend/src/controllers/support.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import * as fs from 'fs';
import * as path from 'path';

const LOCAL_DB_PATH = path.join(process.cwd(), '.complaints_db.json');

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
      const ticketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
      const newComplaint = {
        id: ticketId,
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
      const localData = getLocalDB().complaints;
      const { data: complaintsData, error: cError } = await supabase.from('complaints').select('*');
      if (cError) throw cError;

      // Fetch Agent support tickets
      const { data: supportTicketsData } = await supabase.from('support_tickets').select('*');
      
      // Adapt support_tickets to match complaints structure for merging:
      const adaptedSupportTickets = (supportTicketsData || []).map((t: any) => ({
        id: t.id,
        title: t.subject,
        description: t.description,
        category: 'Agent Support',
        urgency: t.priority,
        status: t.status?.toLowerCase() || 'pending',
        tenant_id: t.tenant_id || t.agent_id,
        tenant_name: `Agent Ticket (Agent: ${t.agent_id})`,
        device_id: null,
        incident_date: null,
        attachment_url: null,
        created_at: t.created_at
      }));

      const merged = [...(complaintsData || []), ...adaptedSupportTickets, ...localData];
      const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
      unique.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return res.json({ success: true, data: unique });
    } catch (err: any) {
      console.error('[listComplaints] error:', err.message);
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
      const localData = getLocalDB().complaints.filter((c: any) => c.tenant_id === tenantId || c.device_id === deviceId);
      
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
      
      const merged = [...data, ...localData];
      const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
      unique.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return res.json({ success: true, data: unique });
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
      // 1. Try updating complaints table
      const { data: cData } = await supabase
        .from('complaints')
        .update({ status })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (cData) {
        return res.json({ success: true, data: cData });
      }

      // 2. Try updating support_tickets table (Agent tickets)
      const mappedStatus = status.toUpperCase();
      const { data: sData } = await supabase
        .from('support_tickets')
        .update({ status: mappedStatus })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (sData) {
        const adapted = {
          id: sData.id,
          title: sData.subject,
          description: sData.description,
          category: 'Agent Support',
          urgency: sData.priority,
          status: sData.status?.toLowerCase() || 'pending',
          tenant_id: sData.tenant_id || sData.agent_id,
          tenant_name: `Agent Ticket (Agent: ${sData.agent_id})`,
          device_id: null,
          incident_date: null,
          attachment_url: null,
          created_at: sData.created_at
        };
        return res.json({ success: true, data: adapted });
      }

      throw new Error('Complaint or Ticket not found');
    } catch (err: any) {
      console.error('[updateComplaintStatus] error:', err.message);
      const db = getLocalDB();
      const comp = db.complaints.find((c: any) => c.id === id);
      if (comp) comp.status = status;
      saveLocalDB(db);
      return res.json({ success: true, data: comp });
    }
  }
}
