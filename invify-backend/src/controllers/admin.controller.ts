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
  virtual_account_number?: string;
  virtual_account_bank?: string;
  virtual_account_status?: string;
  wallet_balance?: number;
  total_wallet_balance?: number;
  available_wallet_balance?: number;
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

  private static getGlobalSettingsData() {
    const GLOBAL_SETTINGS_PATH = path.join(process.cwd(), 'global_settings.json');
    if (!fs.existsSync(GLOBAL_SETTINGS_PATH)) {
      fs.writeFileSync(GLOBAL_SETTINGS_PATH, JSON.stringify({ support_phone: '+234 800 INVIFY' }, null, 2));
    }
    return JSON.parse(fs.readFileSync(GLOBAL_SETTINGS_PATH, 'utf-8'));
  }

  private static saveGlobalSettingsData(data: any) {
    const GLOBAL_SETTINGS_PATH = path.join(process.cwd(), 'global_settings.json');
    fs.writeFileSync(GLOBAL_SETTINGS_PATH, JSON.stringify(data, null, 2));
  }

  static async getGlobalSettings(req: Request, res: Response) {
    try {
      if (process.env.OFFLINE_MOCK_AUTH === 'true') {
        return res.status(200).json(AdminController.getGlobalSettingsData());
      }
      // Assuming a global_settings table with a single row id=1
      const { data, error } = await supabase.from('global_settings').select('*').eq('id', 1).single();
      if (error || !data) {
         return res.status(200).json(AdminController.getGlobalSettingsData());
      }
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(200).json(AdminController.getGlobalSettingsData());
    }
  }

  static async updateGlobalSettings(req: Request, res: Response) {
    try {
      const updates = req.body;
      if (process.env.OFFLINE_MOCK_AUTH === 'true') {
        const current = AdminController.getGlobalSettingsData();
        const updated = { ...current, ...updates };
        AdminController.saveGlobalSettingsData(updated);
        return res.status(200).json(updated);
      }
      
      const { data, error } = await supabase.from('global_settings').upsert({ id: 1, ...updates }).select().single();
      if (error) {
         // Fallback local
         const current = AdminController.getGlobalSettingsData();
         const updated = { ...current, ...updates };
         AdminController.saveGlobalSettingsData(updated);
         return res.status(200).json(updated);
      }
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /admin/tenants
   * Lists all tenants with optional filtering.
   */
  static async listTenants(req: Request, res: Response) {
    if (process.env.OFFLINE_MOCK_AUTH === 'true') {
      console.log('[AdminController] Serving local mock tenants immediately (OFFLINE_MOCK_AUTH active).');
      let data = AdminController.getLocalData();
      
      const { type, status, name } = req.query;
      if (type) {
        data = data.filter(t => t.type === type);
      }
      if (status) {
        data = data.filter(t => t.status === status);
      }
      if (name) {
        const queryStr = String(name).toLowerCase();
        data = data.filter(t => t.name.toLowerCase().includes(queryStr));
      }
      
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
        let fallbackData = [
          { id: '00000000-0000-0000-0000-000000000001', name: 'Lagos Academy School', type: 'school', plan: 'standard', status: 'active', created_at: new Date().toISOString() },
          { id: '00000000-0000-0000-0000-000000000002', name: 'Elite Retail Hub', type: 'retail', plan: 'premium', status: 'active', created_at: new Date().toISOString() },
          { id: '00000000-0000-0000-0000-000000000003', name: 'City Hospital Clinic', type: 'healthcare', plan: 'enterprise', status: 'active', created_at: new Date().toISOString() }
        ];
        
        const { type, status, name } = req.query;
        if (type) {
          fallbackData = fallbackData.filter(t => t.type === type);
        }
        if (status) {
          fallbackData = fallbackData.filter(t => t.status === status);
        }
        if (name) {
          const queryStr = String(name).toLowerCase();
          fallbackData = fallbackData.filter(t => t.name.toLowerCase().includes(queryStr));
        }
        
        return res.status(200).json(fallbackData);
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
        const newTenant: any = {
          id: `tenant-${Date.now()}`,
          name,
          type,
          plan: plan || 'standard',
          status: 'active',
          created_at: new Date().toISOString()
        };

        // Call Quasar SDK for Virtual Account generation even in mock mode
        try {
          const platformApiKey = process.env.QUASER_API_KEY || 'demo-key';
          const QuasarServiceModule = require('../integrations/quasar/quasar.service').QuasarService;
          const quasar = new QuasarServiceModule(platformApiKey);
          const platformId = 'platform-admin-owner-id';
          
          const va = await quasar.createVirtualAccount({
            childId: newTenant.id,
            parentId: platformId,
            currency: 'NGN',
            email: `billing@tenant-${newTenant.id.substring(0,8)}.invify.app`,
            firstName: name.split(' ')[0],
            lastName: name.split(' ').slice(1).join(' ') || 'Business',
            parentShareBps: 0,
            metadata: { type: 'tenant_operating_account' }
          });
          
          newTenant.virtual_account_number = va.accountNumber;
          newTenant.virtual_account_bank = va.bankName;
          newTenant.virtual_account_status = 'ACTIVE';
        } catch (vaError: any) {
          console.error('[AdminController] Mock VA generation failed via Quasar:', vaError.message);
        }

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

      // Generate Virtual Account for Tenant using Quasar SDK
      try {
        const platformApiKey = process.env.QUASER_API_KEY || 'demo-key';
        const QuasarServiceModule = require('../integrations/quasar/quasar.service').QuasarService;
        const quasar = new QuasarServiceModule(platformApiKey);
        
        const platformId = 'platform-admin-owner-id'; // Constant platform parent ID
        
        const va = await quasar.createVirtualAccount({
          childId: data.id,
          parentId: platformId,
          currency: 'NGN',
          email: `billing@tenant-${data.id.substring(0,8)}.invify.app`,
          firstName: name.split(' ')[0],
          lastName: name.split(' ').slice(1).join(' ') || 'Business',
          parentShareBps: 0,
          metadata: { type: 'tenant_operating_account' }
        });
        
        // Save VA details to the tenant record
        await supabase
          .from('tenants')
          .update({
            virtual_account_number: va.accountNumber,
            virtual_account_bank: va.bankName,
            virtual_account_status: 'ACTIVE'
          })
          .eq('id', data.id);
          
      } catch (vaError: any) {
        console.error('[AdminController] Failed to generate Virtual Account for tenant:', vaError.message);
        // We don't block tenant creation if VA generation fails, just log it.
      }

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
      const data = AdminController.getLocalData();
      const match = data.find(t => t.id === id);
      
      const tenantName = match ? match.name : 'Invify Retail Business';
      const tenantType = match ? match.type : 'retail';
      const tenantPlan = match ? match.plan : 'standard';
      const tenantStatus = match ? match.status : 'active';
      const tenantCreatedAt = match ? match.created_at : new Date().toISOString();

      return res.status(200).json({
        tenant: { 
          id, 
          name: tenantName, 
          type: tenantType, 
          plan: tenantPlan, 
          status: tenantStatus, 
          created_at: tenantCreatedAt,
          virtual_account_number: match?.virtual_account_number || null,
          virtual_account_bank: match?.virtual_account_bank || null,
          virtual_account_status: match?.virtual_account_status || null
        },
        users: [
          { id: 'usr-1', name: 'Admin User', role: 'admin' }
        ],
        wallet: { 
          balance: match?.wallet_balance || 0,
          total_wallet_balance: match?.total_wallet_balance || 0,
          available_wallet_balance: match?.available_wallet_balance || 0
        },
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
   * POST /admin/tenants/:id/provision-virtual-account
   * Provisions a virtual account manually via Quasar SDK if not previously created.
   */
  static async provisionVirtualAccount(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (process.env.OFFLINE_MOCK_AUTH === 'true') {
        const data = AdminController.getLocalData();
        const tenant = data.find(t => t.id === id);
        
        if (!tenant) return res.status(404).json({ error: 'Tenant not found locally' });

        try {
          const platformApiKey = process.env.QUASER_API_KEY || 'demo-key';
          const QuasarServiceModule = require('../integrations/quasar/quasar.service').QuasarService;
          const quasar = new QuasarServiceModule(platformApiKey);
          const platformId = 'platform-admin-owner-id';
          
          const va = await quasar.createVirtualAccount({
            childId: tenant.id,
            parentId: platformId,
            currency: 'NGN',
            email: `billing@tenant-${tenant.id.substring(0,8)}.invify.app`,
            firstName: tenant.name.split(' ')[0],
            lastName: tenant.name.split(' ').slice(1).join(' ') || 'Business',
            parentShareBps: 0,
            metadata: { type: 'tenant_operating_account' }
          });
          
          tenant.virtual_account_number = va.accountNumber;
          tenant.virtual_account_bank = va.bankName;
          tenant.virtual_account_status = 'ACTIVE';
          AdminController.saveLocalData(data);
          
          return res.status(200).json({ success: true, va: { accountNumber: va.accountNumber, bankName: va.bankName } });
        } catch (vaError: any) {
          console.error('[AdminController] Mock VA generation failed via Quasar:', vaError.message);
          return res.status(500).json({ error: 'Failed to provision VA: ' + vaError.message });
        }
      }

      // Supabase flow
      const { data: tenant, error: fetchErr } = await supabase.from('tenants').select('*').eq('id', id).single();
      if (fetchErr || !tenant) return res.status(404).json({ error: 'Tenant not found' });

      const platformApiKey = process.env.QUASER_API_KEY || 'demo-key';
      const QuasarServiceModule = require('../integrations/quasar/quasar.service').QuasarService;
      const quasar = new QuasarServiceModule(platformApiKey);
      const platformId = 'platform-admin-owner-id';
      
      const va = await quasar.createVirtualAccount({
        childId: tenant.id,
        parentId: platformId,
        currency: 'NGN',
        email: `billing@tenant-${tenant.id.substring(0,8)}.invify.app`,
        firstName: tenant.name.split(' ')[0],
        lastName: tenant.name.split(' ').slice(1).join(' ') || 'Business',
        parentShareBps: 0,
        metadata: { type: 'tenant_operating_account' }
      });
      
      await supabase
        .from('tenants')
        .update({
          virtual_account_number: va.accountNumber,
          virtual_account_bank: va.bankName,
          virtual_account_status: 'ACTIVE'
        })
        .eq('id', tenant.id);

      return res.status(200).json({ success: true, va: { accountNumber: va.accountNumber, bankName: va.bankName } });
    } catch (error: any) {
      console.error('[AdminController] provisionVirtualAccount Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /admin/tenants/:id/students/:studentId/provision-va
   * Provisions a virtual account manually via Quasar SDK for a specific student.
   */
  static async provisionStudentVirtualAccount(req: Request, res: Response) {
    try {
      const { id, studentId } = req.params;

      if (process.env.OFFLINE_MOCK_AUTH === 'true') {
        try {
          const platformApiKey = process.env.QUASER_API_KEY || 'demo-key';
          const QuasarServiceModule = require('../integrations/quasar/quasar.service').QuasarService;
          const quasar = new QuasarServiceModule(platformApiKey);
          const platformId = 'platform-admin-owner-id';
          
          const va = await quasar.createVirtualAccount({
            childId: studentId,
            parentId: platformId,
            currency: 'NGN',
            email: `student-${studentId}@invify.app`,
            firstName: 'Student',
            lastName: studentId,
            parentShareBps: 0,
            metadata: { type: 'student_account', tenantId: id }
          });
          
          return res.status(200).json({ success: true, va: { accountNumber: va.accountNumber, bankName: va.bankName } });
        } catch (vaError: any) {
          console.error('[AdminController] Mock Student VA generation failed via Quasar:', vaError.message);
          return res.status(500).json({ error: 'Failed to provision Student VA: ' + vaError.message });
        }
      }

      // Supabase flow - verify tenant first
      const { data: tenant, error: fetchErr } = await supabase.from('tenants').select('*').eq('id', id).single();
      if (fetchErr || !tenant) return res.status(404).json({ error: 'Tenant not found' });

      // In real scenario, verify student exists in backend DB too.
      // Here we just provision directly for the given studentId under this tenant.
      
      const platformApiKey = process.env.QUASER_API_KEY || 'demo-key';
      const QuasarServiceModule = require('../integrations/quasar/quasar.service').QuasarService;
      const quasar = new QuasarServiceModule(platformApiKey);
      const platformId = 'platform-admin-owner-id'; // or tenant's subaccount id
      
      const va = await quasar.createVirtualAccount({
        childId: studentId,
        parentId: platformId,
        currency: 'NGN',
        email: `student-${studentId}@invify.app`,
        firstName: 'Student',
        lastName: studentId,
        parentShareBps: 0,
        metadata: { type: 'student_account', tenantId: id }
      });
      
      return res.status(200).json({ success: true, va: { accountNumber: va.accountNumber, bankName: va.bankName } });
    } catch (error: any) {
      console.error('[AdminController] provisionStudentVirtualAccount Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /admin/tenants/:id/customers/:customerId/provision-va
   * Provisions a virtual account manually via Quasar SDK for a specific customer.
   */
  static async provisionCustomerVirtualAccount(req: Request, res: Response) {
    try {
      const { id, customerId } = req.params;

      if (process.env.OFFLINE_MOCK_AUTH === 'true') {
        try {
          const platformApiKey = process.env.QUASER_API_KEY || 'demo-key';
          const QuasarServiceModule = require('../integrations/quasar/quasar.service').QuasarService;
          const quasar = new QuasarServiceModule(platformApiKey);
          const platformId = 'platform-admin-owner-id';
          
          const va = await quasar.createVirtualAccount({
            childId: customerId,
            parentId: platformId,
            currency: 'NGN',
            email: `customer-${customerId}@invify.app`,
            firstName: 'Customer',
            lastName: customerId,
            parentShareBps: 0,
            metadata: { type: 'customer_account', tenantId: id }
          });
          
          return res.status(200).json({ success: true, va: { accountNumber: va.accountNumber, bankName: va.bankName } });
        } catch (vaError: any) {
          console.error('[AdminController] Mock Customer VA generation failed via Quasar:', vaError.message);
          return res.status(500).json({ error: 'Failed to provision Customer VA: ' + vaError.message });
        }
      }

      // Supabase flow - verify tenant first
      const { data: tenant, error: fetchErr } = await supabase.from('tenants').select('*').eq('id', id).single();
      if (fetchErr || !tenant) return res.status(404).json({ error: 'Tenant not found' });

      const platformApiKey = process.env.QUASER_API_KEY || 'demo-key';
      const QuasarServiceModule = require('../integrations/quasar/quasar.service').QuasarService;
      const quasar = new QuasarServiceModule(platformApiKey);
      const platformId = 'platform-admin-owner-id';
      
      const va = await quasar.createVirtualAccount({
        childId: customerId,
        parentId: platformId,
        currency: 'NGN',
        email: `customer-${customerId}@invify.app`,
        firstName: 'Customer',
        lastName: customerId,
        parentShareBps: 0,
        metadata: { type: 'customer_account', tenantId: id }
      });
      
      return res.status(200).json({ success: true, va: { accountNumber: va.accountNumber, bankName: va.bankName } });
    } catch (error: any) {
      console.error('[AdminController] provisionCustomerVirtualAccount Error:', error.message);
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
