// invify-backend/src/controllers/admin.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import { WalletService } from '../services/wallet.service';
import { PDFService } from '../services/pdf.service';
import { BillingService } from '../services/billing.service';
import * as fs from 'fs';
import * as path from 'path';

const LOCAL_TENANTS_DB_PATH = path.join(process.cwd(), 'tenants_db.json');

interface MockTenant {
  id: string;
  name: string;
  type: string;
  plan: string;
  status: string;
  created_at: string;
}

export class AdminController {
  private static initLocalDB() {
    if (!fs.existsSync(LOCAL_TENANTS_DB_PATH)) {
      const initialData = [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Lagos Academy School', type: 'school', plan: 'standard', status: 'active', created_at: new Date().toISOString() },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Elite Retail Hub', type: 'retail', plan: 'premium', status: 'active', created_at: new Date().toISOString() },
        { id: '00000000-0000-0000-0000-000000000003', name: 'City Hospital Clinic', type: 'healthcare', plan: 'enterprise', status: 'active', created_at: new Date().toISOString() }
      ];
      fs.writeFileSync(LOCAL_TENANTS_DB_PATH, JSON.stringify(initialData, null, 2));
    }
  }

  private static getLocalData(): MockTenant[] {
    AdminController.initLocalDB();
    try {
      return JSON.parse(fs.readFileSync(LOCAL_TENANTS_DB_PATH, 'utf-8'));
    } catch (_) {
      return [];
    }
  }

  private static saveLocalData(data: MockTenant[]) {
    fs.writeFileSync(LOCAL_TENANTS_DB_PATH, JSON.stringify(data, null, 2));
  }

  /**
   * GET /admin/tenants
   * Lists all tenants with optional filtering.
   */
  static async listTenants(req: Request, res: Response) {
    if (process.env.OFFLINE_MOCK_AUTH === 'true') {
      console.log('[AdminController] Serving local mock tenants immediately (OFFLINE_MOCK_AUTH active).');
      const data = AdminController.getLocalData();
      return res.status(200).json(data);
    }

    try {
      const { type, status, name } = req.query;

      let query = supabase.from('tenants').select('*');

      if (type) query = query.eq('type', type);
      if (status) query = query.eq('status', status);
      if (name) query = query.ilike('name', `%${name}%`);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      console.error('[AdminController] listTenants Error:', error.message);
      
      const isConnectionTimeout = 
        error.message?.includes('fetch failed') || 
        error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        error.message?.includes('timeout') ||
        error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT';

      if (isConnectionTimeout || process.env.OFFLINE_MOCK_AUTH === 'true') {
        console.warn('[AdminController] Supabase offline fallback triggered for listTenants.');
        return res.status(200).json([
          { id: '00000000-0000-0000-0000-000000000001', name: 'Lagos Academy School', type: 'school', plan: 'standard', status: 'active', created_at: new Date().toISOString() },
          { id: '00000000-0000-0000-0000-000000000002', name: 'Elite Retail Hub', type: 'retail', plan: 'premium', status: 'active', created_at: new Date().toISOString() },
          { id: '00000000-0000-0000-0000-000000000003', name: 'City Hospital Clinic', type: 'healthcare', plan: 'enterprise', status: 'active', created_at: new Date().toISOString() }
        ]);
      }
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /admin/tenants
   * Creates a new tenant organization.
   */
  static async createTenant(req: Request, res: Response) {
    try {
      const { name, type, plan } = req.body;

      if (!name || !type) {
        return res.status(400).json({ error: "Name and Type are required" });
      }

      if (process.env.OFFLINE_MOCK_AUTH === 'true') {
        console.log('[AdminController] Creating tenant locally immediately (OFFLINE_MOCK_AUTH active).');
        const data = AdminController.getLocalData();
        const newTenant: MockTenant = {
          id: `tenant-${Date.now()}`,
          name,
          type,
          plan: plan || 'standard',
          status: 'active',
          created_at: new Date().toISOString()
        };
        data.unshift(newTenant);
        AdminController.saveLocalData(data);
        return res.status(201).json(newTenant);
      }

      const { data, error } = await supabase
        .from('tenants')
        .insert({ name, type, plan: plan || 'free', status: 'active' })
        .select()
        .single();

      if (error) throw error;
      
      // Senior Practice: Auto-create wallet for the new tenant
      await supabase.from('wallets').insert({ tenant_id: data.id, balance: 0 });

      return res.status(201).json(data);
    } catch (error: any) {
      console.error('[AdminController] createTenant Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * PATCH /admin/tenants/:id
   * Updates tenant details or status.
   */
  static async updateTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const { data, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      console.error('[AdminController] updateTenant Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /admin/tenants/:id/details
   * Fetches detailed data for the Tenant Detail Page.
   */
  static async getTenantDetails(req: Request, res: Response) {
    if (process.env.OFFLINE_MOCK_AUTH === 'true') {
      const { id } = req.params;
      const tenantName = id === '00000000-0000-0000-0000-000000000001' ? 'Lagos Academy School' : 'Invify Retail Business';
      return res.status(200).json({
        tenant: { id, name: tenantName, type: 'retail', plan: 'standard', status: 'active' },
        users: [
          { id: 'usr-1', name: 'Admin User', role: 'admin' }
        ],
        wallet: { balance: 1500 },
        recentUsage: []
      });
    }

    try {
      const { id } = req.params;

      // Parallel fetch for deep insights
      const [tenantRes, usersRes, walletInfo, usageRes] = await Promise.all([
        supabase.from('tenants').select('*').eq('id', id).single(),
        supabase.from('users').select('*').eq('tenant_id', id),
        WalletService.getBalance(id), // DERIVED: Sum of ledger entries
        supabase.from('ai_usage').select('*').eq('tenant_id', id).limit(5)
      ]);

      if (tenantRes.error) throw tenantRes.error;

      return res.status(200).json({
        tenant: tenantRes.data,
        users: usersRes.data,
        wallet: { balance: walletInfo.balance }, // Normalized structure for frontend
        recentUsage: usageRes.data
      });
    } catch (error: any) {
      console.error('[AdminController] getTenantDetails Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /admin/ledger
   * Immutable financial history with multi-tenant filtering.
   */
  static async listLedger(req: Request, res: Response) {
    try {
      const { tenantId, startDate, endDate, reference } = req.query;

      let query = supabase
        .from('ledger_entries')
        .select(`
          *,
          tenants (name)
        `);

      if (tenantId) query = query.eq('tenant_id', tenantId);
      if (reference) query = query.ilike('reference', `%${reference}%`);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      console.error('[AdminController] listLedger Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /admin/payments
   * Oversight of all payment intents and statuses.
   */
  static async listPayments(req: Request, res: Response) {
    try {
      const { tenantId, status, provider, reference, startDate, endDate } = req.query;

      let query = supabase
        .from('payments')
        .select(`
          *,
          tenants (name)
        `);

      if (tenantId) query = query.eq('tenant_id', tenantId);
      if (status) query = query.eq('status', status);
      if (provider) query = query.eq('provider', provider);
      if (reference) query = query.ilike('reference', `%${reference}%`);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      console.error('[AdminController] listPayments Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /admin/dashboard-stats
   * Scoped insights for School Owners and Admins.
   */
  static async getDashboardStats(req: Request, res: Response) {
    try {
      const { tenantId, role } = (req as any).user;
      const targetTenantId = (role === 'super_admin' && req.query.tenantId) 
        ? req.query.tenantId as string 
        : tenantId;

      // 1. Fetch Insight Aggregation from Scoped RPC
      const { data: stats, error } = await supabase.rpc('get_tenant_dashboard_stats', { 
        p_tenant_id: targetTenantId 
      });

      if (error) throw error;

      // 2. Fetch Quota Status for the KPI card
      const billing = await BillingService.getBillingStatus(targetTenantId);

      return res.status(200).json({
        ...stats,
        billing
      });
    } catch (error: any) {
      console.error('[AdminController] getDashboardStats Error:', error.message);
      
      const isConnectionTimeout = 
        error.message?.includes('fetch failed') || 
        error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        error.message?.includes('timeout') ||
        error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT';

      if (isConnectionTimeout || process.env.OFFLINE_MOCK_AUTH === 'true') {
        console.warn('[AdminController] Supabase offline fallback triggered for getDashboardStats.');
        return res.status(200).json({
          total_revenue: 1250000,
          active_students: 450,
          pending_invoices: 18,
          billing: { plan: 'PREMIUM', status: 'active', quotaUsed: 65, maxQuota: 100 }
        });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /admin/notes
   * Hybrid Note Repository: Supports "My Notes" and "School Library".
   */
  static async listNotes(req: Request, res: Response) {
    try {
      const { tenantId, id: userId, role } = (req as any).user;
      const { scope } = req.query; // 'personal' or 'school' or 'global'

      let query = supabase.from('lesson_notes').select(`
        *,
        users (name)
      `);

      if (scope === 'personal') {
        // Just the teacher's own notes
        query = query.eq('created_by', userId);
      } else if (scope === 'school') {
        // Everything in the tenant
        if (role === 'super_admin') {
          if (req.query.tenantId) query = query.eq('tenant_id', req.query.tenantId);
        } else {
          query = query.eq('tenant_id', tenantId);
        }
      } else {
        // Global / Shared
        query = query.or(`is_global.eq.true,tenant_id.eq.${tenantId}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      console.error('[AdminController] listNotes Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /admin/notes
   * Save an edited version of a note (Preserves isolation).
   */
  static async saveNote(req: Request, res: Response) {
    try {
      const { subject, topic, class_level, term, week, content, source } = req.body;
      const { tenant_id: tenantId, id: userId } = (req as any).user;

      // Ensure we don't accidentally overwrite a GLOBAL note
      // We always create a new record if it is 'edited'
      const { data, error } = await supabase
        .from('lesson_notes')
        .insert({
          tenant_id: tenantId,
          created_by: userId,
          subject,
          topic,
          class_level,
          term,
          week,
          content,
          source: source || 'edited',
          is_global: false, // Edited versions are tenant-specific
          cache_key: null // Bypass SHA hash to allow variations
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (error: any) {
      console.error('[AdminController] saveNote Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /admin/notes/:id/export
   * Generates and streams a professional PDF version of the lesson note.
   */
  static async exportNotePdf(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // 1. Fetch Note with Tenant Name
      const { data: note, error } = await supabase
        .from('lesson_notes')
        .select('*, tenants(name)')
        .eq('id', id)
        .single();

      if (error || !note) {
        return res.status(404).json({ error: 'Lesson note not found' });
      }

      // 2. Generate PDF
      const pdfBuffer = await PDFService.generateLessonNotePDF(note, note.tenants.name);

      // 3. Stream Response
      const filename = `Lesson_Note_${note.subject}_${note.class_level.replace(/ /g, '_')}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      return res.status(200).send(pdfBuffer);
    } catch (error: any) {
      console.error('[AdminController] exportNotePdf Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * PATCH /admin/profile
   * Updates current user specific metadata (e.g. last_login_at)
   */
  static async updateProfile(req: Request, res: Response) {
    try {
      const { id: userId } = (req as any).user;
      const { last_login_at } = req.body;

      const { error } = await supabase
        .from('users')
        .update({ 
          last_login_at: last_login_at || new Date().toISOString(),
          last_active_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      return res.status(200).json({ status: 'success' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
