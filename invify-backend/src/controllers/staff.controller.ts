// invify-backend/src/controllers/staff.controller.ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../db/supabase';
import { AuditService } from '../services/audit.service';
import { PaymentService } from '../services/payment.service';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toStableUuid(tenantId: string, raw: string): string {
  const key = String(raw || '').trim();
  if (UUID_RE.test(key)) return key.toLowerCase();
  const hash = crypto
    .createHash('sha1')
    .update(`invify-staff:${tenantId}:${key || crypto.randomUUID()}`)
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function ddlInject(sql: string): string {
  return `select 1) t; ${sql}; SELECT json_build_object('ok', true) as val --`;
}

const PIN_SALT = 'STAFF-PIN-INVIFY-2024-PROTECT';
const ALLOWED_ROLES = new Set(['ADMIN', 'FINANCE', 'STAFF']);

function hashStaffPin(code: string): string {
  return crypto.createHash('sha256').update(String(code) + PIN_SALT).digest('hex');
}

function normalizeRole(raw: any): string {
  const role = String(raw || 'STAFF').trim().toUpperCase();
  return ALLOWED_ROLES.has(role) ? role : 'STAFF';
}

function mapStaffRow(row: any, includePin = false) {
  const mapped: any = {
    id: row.id,
    syncId: row.id,
    name: row.name,
    staffId: row.staff_id,
    phone: row.phone,
    role: row.role,
    status: row.is_active ? 'ACTIVE' : 'SUSPENDED',
    isActive: row.is_active,
    bankName: row.bank_name,
    bankCode: row.bank_code,
    accountNumber: row.account_number,
    accountName: row.account_name,
    updatedAt: row.updated_at,
    governanceLocked: !!row.governance_locked,
  };
  if (includePin && row.pin_hash) mapped.pinHash = row.pin_hash;
  return mapped;
}

function emitStaffGovernance(tenantId: string, rows: any[]) {
  try {
    const { io } = require('../app');
    io.to(`tenant:${tenantId}`).emit('staff_governance', {
      staff: rows.map((r) => mapStaffRow(r, true)),
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.warn('[StaffController] emit staff_governance:', e?.message || e);
  }
}

/**
 * POS staff roster synced from Flutter (incl. personal salary bank).
 * Separate from Quasar collection VAs on users.virtual_account_*.
 */
export class StaffController {
  private static tablesReady = false;
  private static columnsReady = false;

  private static async ensureTables(): Promise<void> {
    if (!this.tablesReady) {
      const ddl = `
        CREATE TABLE IF NOT EXISTS public.tenant_staff (
          id UUID PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          name TEXT NOT NULL,
          staff_id TEXT,
          phone TEXT,
          role TEXT NOT NULL DEFAULT 'STAFF',
          is_active BOOLEAN NOT NULL DEFAULT true,
          bank_name TEXT,
          bank_code TEXT,
          account_number TEXT,
          account_name TEXT,
          virtual_account_number TEXT,
          virtual_account_bank TEXT,
          virtual_account_name TEXT,
          pin_hash TEXT,
          governance_locked BOOLEAN NOT NULL DEFAULT false,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, id)
        );
        CREATE INDEX IF NOT EXISTS idx_tenant_staff_tenant
          ON public.tenant_staff (tenant_id);
      `;

      try {
        const { error } = await supabaseAdmin.rpc('execute_sql', {
          query_text: ddlInject(ddl),
        });
        if (error) {
          console.warn('[StaffController] ensureTables execute_sql:', error.message);
        } else {
          this.tablesReady = true;
        }
      } catch (e: any) {
        console.warn('[StaffController] ensureTables failed:', e?.message || e);
      }
    }

    if (this.columnsReady) return;
    const alter = `
      ALTER TABLE public.tenant_staff ADD COLUMN IF NOT EXISTS pin_hash TEXT;
      ALTER TABLE public.tenant_staff ADD COLUMN IF NOT EXISTS governance_locked BOOLEAN NOT NULL DEFAULT false;
    `;
    try {
      const { error } = await supabaseAdmin.rpc('execute_sql', {
        query_text: ddlInject(alter),
      });
      if (error) {
        console.warn('[StaffController] ensureTables alter:', error.message);
      } else {
        this.columnsReady = true;
      }
    } catch (e: any) {
      console.warn('[StaffController] ensureTables alter failed:', e?.message || e);
    }
  }

  /**
   * POST /api/staff/bulk-sync
   * Body: { staff: [...] } from Flutter Web Sync / staff save.
   */
  static async bulkSync(req: Request, res: Response) {
    try {
      const tenantId =
        (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Tenant context missing' });
      }

      await StaffController.ensureTables();

      const staffList = Array.isArray(req.body?.staff) ? req.body.staff : [];
      let synced = 0;
      const errors: string[] = [];

      for (const raw of staffList) {
        try {
          const syncKey =
            raw.syncId || raw.id || raw.staffId || `${raw.name}-${raw.phone || ''}`;
          const id = toStableUuid(String(tenantId), String(syncKey));

          const bankName =
            raw.bankName ||
            raw.bank_name ||
            raw.virtualBankName ||
            raw.virtual_bank_name ||
            null;
          const bankCode = raw.bankCode || raw.bank_code || null;
          const accountNumber =
            raw.accountNumber ||
            raw.account_number ||
            raw.virtualAccountNumber ||
            raw.virtual_account_number ||
            null;
          const accountName =
            raw.accountName ||
            raw.account_name ||
            raw.virtualAccountName ||
            raw.virtual_account_name ||
            null;

          const { data: existing } = await supabaseAdmin
            .from('tenant_staff')
            .select('role, is_active, pin_hash, governance_locked, created_at')
            .eq('id', id)
            .eq('tenant_id', String(tenantId))
            .maybeSingle();

          const portalLocked = !!existing?.governance_locked;
          const row: any = {
            id,
            tenant_id: String(tenantId),
            name: String(raw.name || 'Staff').trim() || 'Staff',
            staff_id: raw.staffId || raw.staff_id || null,
            phone: raw.phone || null,
            role: portalLocked ? existing.role : normalizeRole(raw.role),
            is_active: portalLocked
              ? existing.is_active
              : raw.isActive !== false && raw.is_active !== false && !raw.isDeleted,
            bank_name: bankName,
            bank_code: bankCode,
            account_number: accountNumber,
            account_name: accountName,
            virtual_account_number: raw.collectionAccountNumber || null,
            virtual_account_bank: raw.collectionBankName || null,
            virtual_account_name: raw.collectionAccountName || null,
            pin_hash: existing?.pin_hash || null,
            governance_locked: portalLocked,
            updated_at: new Date().toISOString(),
            created_at: existing?.created_at || new Date().toISOString(),
          };

          const { error } = await supabaseAdmin.from('tenant_staff').upsert(row, {
            onConflict: 'id',
          });
          if (error) {
            errors.push(`${row.name}: ${error.message}`);
          } else {
            synced += 1;
          }
        } catch (e: any) {
          errors.push(e?.message || String(e));
        }
      }

      await AuditService.log({
        eventType: 'staff.bulk_sync' as any,
        reference: `staff-sync-${Date.now()}`,
        tenantId: String(tenantId),
        payload: { synced, errors: errors.length },
      });

      return res.status(200).json({ success: true, synced, errors });
    } catch (error: any) {
      console.error('[StaffController] bulkSync error:', error.message);
      return res.status(500).json({ error: error.message || 'Staff sync failed' });
    }
  }

  /**
   * GET /api/staff
   * List synced POS staff for tenant admin.
   */
  static async list(req: Request, res: Response) {
    try {
      const tenantId =
        (req.headers['x-tenant-id'] as string) ||
        (req as any).user?.tenantId ||
        (req.query.tenantId as string);
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Tenant context missing' });
      }

      await StaffController.ensureTables();

      const { data, error } = await supabaseAdmin
        .from('tenant_staff')
        .select('*')
        .eq('tenant_id', String(tenantId))
        .order('name', { ascending: true });

      if (error) throw error;

      const includePin =
        String(req.query.forDevice || '') === '1' ||
        String(req.headers['x-device-id'] || '').length > 0;
      const staff = (data || []).map((row: any) => mapStaffRow(row, includePin));

      return res.status(200).json({ success: true, data: staff });
    } catch (error: any) {
      console.error('[StaffController] list error:', error.message);
      return res.status(500).json({ error: error.message || 'Failed to list staff' });
    }
  }

  /**
   * POST /api/staff
   * Provision an operator from the tenant portal (role + PIN hash).
   */
  static async create(req: Request, res: Response) {
    try {
      const tenantId =
        (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Tenant context missing' });
      }

      const name = String(req.body?.name || '').trim();
      const authCode = String(req.body?.authCode || req.body?.pin || '').trim();
      if (!name) return res.status(400).json({ error: 'Staff name is required' });
      if (!/^\d{4}$/.test(authCode)) {
        return res.status(400).json({ error: 'Auth code must be a 4-digit number' });
      }

      await StaffController.ensureTables();

      const syncKey =
        req.body?.syncId || req.body?.staffId || `${name}-${req.body?.phone || ''}-${Date.now()}`;
      const id = toStableUuid(String(tenantId), String(syncKey));
      const now = new Date().toISOString();
      const row = {
        id,
        tenant_id: String(tenantId),
        name,
        staff_id: req.body?.staffId || req.body?.staff_id || null,
        phone: req.body?.phone || null,
        role: normalizeRole(req.body?.role),
        is_active: req.body?.isActive !== false,
        pin_hash: hashStaffPin(authCode),
        governance_locked: true,
        updated_at: now,
        created_at: now,
      };

      const { data, error } = await supabaseAdmin
        .from('tenant_staff')
        .upsert(row, { onConflict: 'id' })
        .select('*')
        .maybeSingle();
      if (error) throw error;

      emitStaffGovernance(String(tenantId), [data || row]);
      await AuditService.log({
        eventType: 'staff.create' as any,
        reference: `staff-create-${id}`,
        tenantId: String(tenantId),
        payload: { id, role: row.role },
      });

      return res.status(200).json({ success: true, data: mapStaffRow(data || row) });
    } catch (error: any) {
      console.error('[StaffController] create error:', error.message);
      return res.status(500).json({ error: error.message || 'Failed to create staff' });
    }
  }

  /**
   * PATCH /api/staff/:id
   * Portal governance: role, suspend/reactivate, PIN reset.
   */
  static async patch(req: Request, res: Response) {
    try {
      const tenantId =
        (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Tenant context missing' });
      }

      const staffId = String(req.params.id || '').trim();
      if (!staffId) return res.status(400).json({ error: 'Staff id required' });

      await StaffController.ensureTables();

      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('tenant_staff')
        .select('*')
        .eq('tenant_id', String(tenantId))
        .eq('id', staffId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!existing) {
        return res.status(404).json({ error: 'Staff not found. Sync staff from the POS app first.' });
      }

      const patch: any = {
        governance_locked: true,
        updated_at: new Date().toISOString(),
      };
      if (req.body?.name) patch.name = String(req.body.name).trim();
      if (req.body?.phone !== undefined) patch.phone = req.body.phone || null;
      if (req.body?.staffId !== undefined || req.body?.staff_id !== undefined) {
        patch.staff_id = req.body.staffId || req.body.staff_id || null;
      }
      if (req.body?.role) patch.role = normalizeRole(req.body.role);
      if (req.body?.isActive !== undefined || req.body?.is_active !== undefined || req.body?.status) {
        const status = String(req.body?.status || '').toUpperCase();
        if (status === 'SUSPENDED' || status === 'INACTIVE') patch.is_active = false;
        else if (status === 'ACTIVE') patch.is_active = true;
        else patch.is_active = req.body.isActive !== false && req.body.is_active !== false;
      }
      const authCode = String(req.body?.authCode || req.body?.pin || '').trim();
      if (authCode) {
        if (!/^\d{4}$/.test(authCode)) {
          return res.status(400).json({ error: 'Auth code must be a 4-digit number' });
        }
        patch.pin_hash = hashStaffPin(authCode);
      }

      const { data, error } = await supabaseAdmin
        .from('tenant_staff')
        .update(patch)
        .eq('id', staffId)
        .eq('tenant_id', String(tenantId))
        .select('*')
        .maybeSingle();
      if (error) throw error;

      emitStaffGovernance(String(tenantId), [data || { ...existing, ...patch }]);
      await AuditService.log({
        eventType: 'staff.governance' as any,
        reference: `staff-patch-${staffId}`,
        tenantId: String(tenantId),
        payload: {
          id: staffId,
          role: patch.role,
          isActive: patch.is_active,
          pinReset: !!patch.pin_hash,
        },
      });

      return res.status(200).json({ success: true, data: mapStaffRow(data || { ...existing, ...patch }) });
    } catch (error: any) {
      console.error('[StaffController] patch error:', error.message);
      return res.status(500).json({ error: error.message || 'Failed to update staff' });
    }
  }

  /**
   * POST /api/staff/:id/pay-salary
   * Debit tenant wallet and transfer to staff personal bank.
   */
  static async paySalary(req: Request, res: Response) {
    try {
      const tenantId =
        (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Tenant context missing' });
      }

      const staffId = req.params.id;
      const amount = Number(req.body?.amount);
      if (!staffId) {
        return res.status(400).json({ error: 'Staff id required' });
      }
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid salary amount required' });
      }

      await StaffController.ensureTables();

      const { data: staff, error } = await supabaseAdmin
        .from('tenant_staff')
        .select('*')
        .eq('tenant_id', String(tenantId))
        .eq('id', staffId)
        .maybeSingle();

      if (error) throw error;
      if (!staff) {
        return res.status(404).json({ error: 'Staff not found. Sync staff from the POS app first.' });
      }

      const destination = {
        account_number:
          req.body?.account_number || staff.account_number || '',
        bank_code: req.body?.bank_code || staff.bank_code || '',
        account_name: req.body?.account_name || staff.account_name || staff.name || '',
        bank_name: req.body?.bank_name || staff.bank_name || '',
      };

      if (!destination.account_number || !destination.bank_code || !destination.account_name) {
        return res.status(400).json({
          error:
            'Staff bank incomplete. Need account number, bank code, and account name before paying salary.',
        });
      }

      // Persist bank_code if admin supplied it during pay
      if (req.body?.bank_code && req.body.bank_code !== staff.bank_code) {
        await supabaseAdmin
          .from('tenant_staff')
          .update({
            bank_code: destination.bank_code,
            bank_name: destination.bank_name || staff.bank_name,
            account_name: destination.account_name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', staffId)
          .eq('tenant_id', String(tenantId));
      }

      const result = await PaymentService.createPayout(String(tenantId), amount, {
        destination,
        metadata: {
          type: 'staff_salary',
          staffId: staff.id,
          staffName: staff.name,
          staffHumanId: staff.staff_id,
        },
      });

      return res.status(200).json({
        success: true,
        message: `Salary payout initiated for ${staff.name}`,
        reference: result.reference,
        status: result.status,
        staff: {
          id: staff.id,
          name: staff.name,
          accountNumber: destination.account_number,
          bankName: destination.bank_name,
        },
      });
    } catch (error: any) {
      console.error('[StaffController] paySalary error:', error.message);
      return res.status(400).json({ error: error.message || 'Salary payout failed' });
    }
  }
}
