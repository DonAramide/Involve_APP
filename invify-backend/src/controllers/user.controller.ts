// src/controllers/user.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import { UserDeviceService } from '../services/user-device.service';
import { AuditArchiveService } from '../services/audit-archive.service';
import * as fs from 'fs';
import * as path from 'path';

const LOCAL_USERS_DB_PATH = path.join(process.cwd(), 'users_db.json');

function initLocalUsersDB() {
  if (!fs.existsSync(LOCAL_USERS_DB_PATH)) {
    const initial = [
      { id: 'usr-sa-001', name: 'Super Admin Master', email: 'superadmin@IIPS.app', role: 'super_admin', tenant_id: null, is_mfa_enabled: true, is_active: true, created_at: new Date().toISOString() },
      { id: 'usr-st-002', name: 'Security Staff Node', email: 'sec-staff-node@IIPS.app', role: 'internal_staff', tenant_id: null, is_mfa_enabled: true, is_active: true, created_at: new Date().toISOString() },
      { id: 'usr-ta-003', name: 'Alpha Tenant Admin', email: 'admin@fintech-alpha.dev', role: 'tenant_admin', tenant_id: '00000000-0000-0000-0000-000000000001', is_mfa_enabled: false, is_active: true, created_at: new Date().toISOString() },
      { id: 'usr-to-004', name: 'Kiosk Agent', email: 'kiosk-agent@fintech-alpha.dev', role: 'tenant_operator', tenant_id: '00000000-0000-0000-0000-000000000001', is_mfa_enabled: false, is_active: true, created_at: new Date().toISOString() },
      { id: 'usr-pc-005', name: 'Pro Customer', email: 'pro-user@IIPS.app', role: 'pro_customer', tenant_id: '00000000-0000-0000-0000-000000000002', is_mfa_enabled: true, is_active: true, created_at: new Date().toISOString() },
      { id: 'usr-to-006', name: 'Suspended Node', email: 'suspended-node@omega-retail.com', role: 'tenant_operator', tenant_id: '00000000-0000-0000-0000-000000000003', is_mfa_enabled: true, is_active: false, created_at: new Date().toISOString() }
    ];
    fs.writeFileSync(LOCAL_USERS_DB_PATH, JSON.stringify(initial, null, 2));
  }
}

function getLocalUsers(): any[] {
  initLocalUsersDB();
  try {
    return JSON.parse(fs.readFileSync(LOCAL_USERS_DB_PATH, 'utf-8'));
  } catch (_) {
    return [];
  }
}

function saveLocalUsers(data: any[]) {
  fs.writeFileSync(LOCAL_USERS_DB_PATH, JSON.stringify(data, null, 2));
}

function isOfflineMode(error?: any): boolean {
  return (
    process.env.OFFLINE_MOCK_AUTH === 'true' ||
    error?.message?.includes('fetch failed') ||
    error?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
    error?.message?.includes('timeout') ||
    error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT'
  );
}

function getLocalTenants(): any[] {
  try {
    const tenantsDbPath = path.join(process.cwd(), 'tenants_db.json');
    if (fs.existsSync(tenantsDbPath)) {
      return JSON.parse(fs.readFileSync(tenantsDbPath, 'utf-8'));
    }
  } catch (_) {}
  return [];
}

export class UserController {
  /**
   * GET /admin/users
   * Scoped listing of users.
   */
  static async listUsers(req: Request, res: Response) {
    if (isOfflineMode()) {
      console.log('[UserController] Serving local offline users list.');
      const { role, tenantId } = (req as any).user;
      let list = getLocalUsers();

      if (role !== 'super_admin') {
        list = list.filter(u => u.tenant_id === tenantId);
      } else if (req.query.tenantId) {
        list = list.filter(u => u.tenant_id === req.query.tenantId);
      }

      const tenants = getLocalTenants();
      const mapped = list.map(u => {
        const tenant = tenants.find((t: any) => t.id === u.tenant_id);
        return {
          ...u,
          tenants: tenant ? { name: tenant.name } : null
        };
      });

      return res.status(200).json(mapped);
    }

    try {
      const { role, tenantId } = (req as any).user;
      
      let query = supabase.from('users').select(`
        *,
        tenants (name)
      `);

      // 1. Isolation Rule
      if (role !== 'super_admin') {
        // Tenant Admins only see their users
        query = query.eq('tenant_id', tenantId);
      } else if (req.query.tenantId) {
        // Super Admins can filter by tenant
        query = query.eq('tenant_id', req.query.tenantId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      if (isOfflineMode(error)) {
        console.warn('[UserController] Supabase connection error in listUsers. Serving local offline fallback.');
        const { role, tenantId } = (req as any).user;
        let list = getLocalUsers();

        if (role !== 'super_admin') {
          list = list.filter(u => u.tenant_id === tenantId);
        } else if (req.query.tenantId) {
          list = list.filter(u => u.tenant_id === req.query.tenantId);
        }

        const tenants = getLocalTenants();
        const mapped = list.map(u => {
          const tenant = tenants.find((t: any) => t.id === u.tenant_id);
          return {
            ...u,
            tenants: tenant ? { name: tenant.name } : null
          };
        });

        return res.status(200).json(mapped);
      }
      console.error('[UserController] listUsers Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /admin/users
   * Create a platform user. Note: Actual Auth Record must be in Supabase.
   */
  static async createUser(req: Request, res: Response) {
    const { id, name, email, role, tenantId } = req.body;
    const currentUser = (req as any).user;

    const isPlatform = [
      'super_admin',
      'admin_finance',
      'admin_treasury',
      'admin_risk',
      'admin_ops',
      'admin_executive',
      'admin_deploy',
      'internal_staff'
    ].includes(role);

    // 1. Validation
    if (currentUser.role !== 'super_admin') {
      if (tenantId !== currentUser.tenantId) {
        return res.status(403).json({ error: 'Cannot create users for other tenants' });
      }
      if (isPlatform) {
        return res.status(403).json({ error: 'Tenant admins cannot assign platform-level roles' });
      }
    }

    if (isOfflineMode()) {
      console.log('[UserController] Creating user offline.');
      const list = getLocalUsers();
      
      const exists = list.some(u => u.email === email);
      if (exists) {
        return res.status(400).json({ error: 'A user with this email already exists' });
      }

      const newUser = {
        id: id || `usr-mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: name || email.split('@')[0],
        email,
        role,
        tenant_id: isPlatform ? null : tenantId,
        is_mfa_enabled: false,
        is_active: true,
        created_at: new Date().toISOString()
      };

      list.unshift(newUser);
      saveLocalUsers(list);

      const tenants = getLocalTenants();
      const tenant = tenants.find((t: any) => t.id === newUser.tenant_id);

      return res.status(201).json({
        ...newUser,
        tenants: tenant ? { name: tenant.name } : null
      });
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          id,
          name,
          email,
          role,
          tenant_id: isPlatform ? null : tenantId,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (error: any) {
      if (isOfflineMode(error)) {
        console.warn('[UserController] Supabase connection error in createUser. Falling back to local database.');
        const list = getLocalUsers();
        
        const exists = list.some(u => u.email === email);
        if (exists) {
          return res.status(400).json({ error: 'A user with this email already exists' });
        }

        const newUser = {
          id: id || `usr-mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: name || email.split('@')[0],
          email,
          role,
          tenant_id: isPlatform ? null : tenantId,
          is_mfa_enabled: false,
          is_active: true,
          created_at: new Date().toISOString()
        };

        list.unshift(newUser);
        saveLocalUsers(list);

        const tenants = getLocalTenants();
        const tenant = tenants.find((t: any) => t.id === newUser.tenant_id);

        return res.status(201).json({
          ...newUser,
          tenants: tenant ? { name: tenant.name } : null
        });
      }
      console.error('[UserController] createUser Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * PATCH /admin/users/:id
   * Update role or status.
   */
  static async updateUser(req: Request, res: Response) {
    const { id } = req.params;
    const updates = req.body;
    const currentUser = (req as any).user;

    // Ensure no tenant-override if not super_admin
    if (currentUser.role !== 'super_admin') {
      delete updates.tenant_id;
      
      // Prevent tenant admin from elevating someone to a platform role
      if (updates.role && [
        'super_admin',
        'admin_finance',
        'admin_treasury',
        'admin_risk',
        'admin_ops',
        'admin_executive',
        'admin_deploy',
        'internal_staff'
      ].includes(updates.role)) {
        return res.status(403).json({ error: 'Tenant admins cannot assign platform-level roles' });
      }
    } else {
      // If super_admin, force tenant_id to null for platform roles
      if (updates.role) {
        const isPlatform = [
          'super_admin',
          'admin_finance',
          'admin_treasury',
          'admin_risk',
          'admin_ops',
          'admin_executive',
          'admin_deploy',
          'internal_staff'
        ].includes(updates.role);
        if (isPlatform) {
          updates.tenant_id = null;
        }
      }
    }

    if (isOfflineMode()) {
      console.log('[UserController] Updating user offline:', id);
      const list = getLocalUsers();
      const index = list.findIndex(u => u.id === id);
      if (index === -1) return res.status(404).json({ error: 'User not found' });

      // Map is_active if it is updated (support both status string and is_active bool)
      if (updates.status) {
        updates.is_active = updates.status === 'ACTIVE';
      }

      list[index] = { ...list[index], ...updates };
      saveLocalUsers(list);

      const tenants = getLocalTenants();
      const tenant = tenants.find((t: any) => t.id === list[index].tenant_id);

      return res.status(200).json({
        ...list[index],
        tenants: tenant ? { name: tenant.name } : null
      });
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      if (isOfflineMode(error)) {
        console.warn('[UserController] Supabase connection error in updateUser. Falling back to local database.');
        const list = getLocalUsers();
        const index = list.findIndex(u => u.id === id);
        if (index === -1) return res.status(404).json({ error: 'User not found' });

        if (updates.status) {
          updates.is_active = updates.status === 'ACTIVE';
        }

        list[index] = { ...list[index], ...updates };
        saveLocalUsers(list);

        const tenants = getLocalTenants();
        const tenant = tenants.find((t: any) => t.id === list[index].tenant_id);

        return res.status(200).json({
          ...list[index],
          tenants: tenant ? { name: tenant.name } : null
        });
      }
      console.error('[UserController] updateUser Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  static async listDevices(req: Request, res: Response) {
    try {
      const filters = {
        status: req.query.status ? String(req.query.status) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        page: req.query.page ? String(req.query.page) : undefined,
        limit: req.query.limit ? String(req.query.limit) : undefined
      };
      const result = await UserDeviceService.getDevices(filters);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async approveDevice(req: Request, res: Response) {
    try {
      const { id } = req.body;
      const approvedBy = (req as any).user?.email || 'admin';
      if (!id) return res.status(400).json({ error: 'Device ID/Record ID is required' });
      await UserDeviceService.approveDevice(id, approvedBy);
      return res.status(200).json({ message: 'Device access approved successfully.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async blockDevice(req: Request, res: Response) {
    try {
      const { id } = req.body;
      const blockedBy = (req as any).user?.email || 'admin';
      if (!id) return res.status(400).json({ error: 'Device ID/Record ID is required' });
      await UserDeviceService.blockDevice(id, blockedBy);
      return res.status(200).json({ message: 'Device access blocked.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async triggerArchiving(req: Request, res: Response) {
    try {
      const result = await AuditArchiveService.runArchiving();
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
