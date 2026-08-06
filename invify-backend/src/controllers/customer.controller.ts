import { Request, Response } from 'express';
import crypto from 'crypto';
import { getQuasarService } from '../integrations/quasar/factory';
import { AuditService } from '../services/audit.service';
import { customerService } from '../services/customer.service';
import { CustomerStatus } from '../types/customer.dto';
import { supabaseAdmin } from '../db/supabase';

export class CustomerController {
  /**
   * POST /api/finance/customer-virtual-account/:customerId
   */
  static async getVirtualAccount(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      const { name, email, phone } = req.body;

      if (!customerId) return res.status(400).json({ error: "Customer ID is required" });
      if (!tenantId) return res.status(401).json({ error: "Unauthorized: Tenant context missing" });

      if (!name || name.trim().split(/\s+/).length < 2) {
        return res.status(400).json({ error: "Customer's full name (first and last name) is required to provision a virtual account." });
      }
      if (!email || email.trim() === '') {
        return res.status(400).json({ error: "Customer email is required" });
      }
      if (!phone || phone.trim() === '') {
        return res.status(400).json({ error: "Customer phone number is required" });
      }

      // Check if we already have it in the database
      const { data: existing } = await supabaseAdmin
        .from('customers')
        .select('virtual_account_number, virtual_account_bank, virtual_account_name')
        .eq('id', customerId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existing && existing.virtual_account_number) {
        return res.status(200).json({
          accountNumber: existing.virtual_account_number,
          bankName: existing.virtual_account_bank,
          accountName: existing.virtual_account_name || name
        });
      }

      const quasar = await getQuasarService(tenantId);
      const reference = `VA-CUST-${customerId.substring(0, 8)}-${Date.now()}`;
      
      const quasarAccount = await quasar.createVirtualAccount({
        childId: customerId, 
        parentId: tenantId,  
        email: email || `customer-${customerId.substring(0, 8)}@invify.com`,
        firstName: name?.split(' ')[0] || 'Valued',
        lastName: name?.split(' ').slice(1).join(' ') || 'Customer',
        metadata: { source: 'customer_provisioning', phone: phone }
      });

      const acctName = (quasarAccount as any).accountName || name;

      // Save to Supabase customers table
      await supabaseAdmin
        .from('customers')
        .update({
          virtual_account_number: quasarAccount.accountNumber,
          virtual_account_bank: quasarAccount.bankName,
          virtual_account_name: acctName,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .eq('tenant_id', tenantId);

      await AuditService.log({
        eventType: 'virtual_account.created' as any,
        reference,
        tenantId: tenantId,
        payload: { customerId, accountNumber: quasarAccount.accountNumber, bankName: quasarAccount.bankName }
      });

      return res.status(200).json({
        accountNumber: quasarAccount.accountNumber,
        bankName: quasarAccount.bankName,
        accountName: acctName
      });
    } catch (error: any) {
      console.error('[CustomerController] getVirtualAccount Error:', error.message);
      return res.status(500).json({ error: "Failed to provision customer virtual account" });
    }
  }

  static async searchCustomers(req: Request, res: Response) {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized: Tenant context missing" });

      const options = {
        page: parseInt(req.query.page as string) || 1,
        pageSize: parseInt(req.query.pageSize as string) || 50,
        search: req.query.search as string,
        sort: req.query.sort as string,
        direction: req.query.direction as 'asc' | 'desc',
        status: req.query.status as CustomerStatus,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string
      };

      const result = await customerService.searchCustomers(tenantId, options);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[CustomerController] searchCustomers Error:', error.message);
      return res.status(500).json({ error: "Failed to search customers" });
    }
  }

  static async getCustomerSummary(req: Request, res: Response) {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      const customerId = req.params.id;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const summary = await customerService.getCustomerSummary(tenantId, customerId);
      if (!summary) return res.status(404).json({ error: "Customer not found" });

      return res.status(200).json(summary);
    } catch (error: any) {
      console.error('[CustomerController] getCustomerSummary Error:', error.message);
      return res.status(500).json({ error: "Failed to fetch customer summary" });
    }
  }

  static async createCustomer(req: Request, res: Response) {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const customer = await customerService.createCustomer(tenantId, req.body);
      return res.status(201).json(customer);
    } catch (error: any) {
      console.error('[CustomerController] createCustomer Error:', error.message);
      return res.status(500).json({ error: "Failed to create customer" });
    }
  }

  static async bulkSyncCustomers(req: Request, res: Response) {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      const { customers } = req.body as { customers: any[] };

      if (!tenantId) return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
      if (!Array.isArray(customers) || customers.length === 0) {
        return res.status(400).json({ error: 'customers array is required and must not be empty.' });
      }

      const result = await customerService.bulkUpsertCustomers(tenantId, customers);
      await AuditService.log({
        eventType: 'customer.bulk_sync' as any,
        reference: `CUST-BULK-SYNC-${tenantId}`,
        tenantId,
        payload: { synced: result.synced, errors: result.errors.length },
      });

      return res.status(200).json({
        success: result.errors.length === 0,
        synced: result.synced,
        errors: result.errors,
      });
    } catch (e: any) {
      console.error('[CustomerController] bulkSyncCustomers Error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  static async updateCustomer(req: Request, res: Response) {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      const customerId = req.params.id;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const customer = await customerService.updateCustomer(tenantId, customerId, req.body);
      return res.status(200).json(customer);
    } catch (error: any) {
      console.error('[CustomerController] updateCustomer Error:', error.message);
      return res.status(500).json({ error: "Failed to update customer" });
    }
  }

  static async getStaffVirtualAccount(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      const { customLastName, email, phone } = req.body;

      if (!userId) return res.status(400).json({ error: "Staff User ID is required" });
      if (!tenantId) return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
      if (!customLastName || customLastName.trim() === '') {
        return res.status(400).json({ error: "Custom second name is required" });
      }

      // Fetch tenant/business details for the business name
      const { data: tenant, error: tenantErr } = await supabaseAdmin
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .single();
        
      if (tenantErr || !tenant) {
        return res.status(404).json({ error: "Tenant business not found" });
      }

      const companyName = tenant.name;
      let defaultEmail = `staff-${userId.substring(0, 8)}@invify.app`;
      let defaultPhone = undefined;

      // Try to get staff details if they exist in platform users table
      try {
        const { data: staffUser } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (staffUser) {
          if (staffUser.email) defaultEmail = staffUser.email;
          if (staffUser.phone) defaultPhone = staffUser.phone;
        }
      } catch (dbErr) {
        // Safe to ignore if table/record query fails, fall back to default email
      }

      const quasar = await getQuasarService(tenantId);
      const platformId = 'platform-admin-owner-id';

      const quasarAccount = await quasar.createVirtualAccount({
        childId: userId,
        parentId: platformId,
        email: email || defaultEmail,
        firstName: companyName,
        lastName: customLastName,
        parentShareBps: 0,
        metadata: { 
          type: 'staff_account', 
          tenantId: tenantId, 
          phone: phone || defaultPhone || undefined 
        }
      });

      // Save to Supabase users table
      await supabaseAdmin
        .from('users')
        .update({
          virtual_account_number: quasarAccount.accountNumber,
          virtual_account_bank: quasarAccount.bankName,
          virtual_account_name: quasarAccount.accountName || `${companyName} ${customLastName}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .eq('tenant_id', tenantId);

      return res.status(200).json({
        accountNumber: quasarAccount.accountNumber,
        bankName: quasarAccount.bankName,
        accountName: quasarAccount.accountName || `${companyName} ${customLastName}`
      });
    } catch (error: any) {
      console.error('[CustomerController] getStaffVirtualAccount Error:', error.message);
      return res.status(500).json({ error: "Failed to provision staff virtual account" });
    }
  }

  static async listTenantVirtualAccounts(req: Request, res: Response) {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized: Tenant context missing" });

      // 1. Fetch Customers with virtual accounts
      const { data: customers, error: custErr } = await supabaseAdmin
        .from('customers')
        .select('id, name, phone, email, virtual_account_number, virtual_account_bank, virtual_account_name, balance')
        .eq('tenant_id', tenantId)
        .not('virtual_account_number', 'is', null);

      if (custErr) throw custErr;

      // 2. Fetch Staff with virtual accounts
      let staff: any[] = [];
      try {
        const { data: staffData, error: staffErr } = await supabaseAdmin
          .from('users')
          .select('id, name, email, phone, virtual_account_number, virtual_account_bank, virtual_account_name')
          .eq('tenant_id', tenantId)
          .not('virtual_account_number', 'is', null);

        if (staffErr) {
          console.warn('[CustomerController] users table query failed (columns might be missing):', staffErr.message);
        } else {
          staff = staffData || [];
        }
      } catch (err: any) {
        console.warn('[CustomerController] users table query threw exception:', err.message);
      }

      // 3. Load SUCCESS txs once, then compute pending per VA from real credits − sweeps
      const { data: txns, error: txErr } = await supabaseAdmin
        .from('transactions_log')
        .select('amount, type, status, metadata, reference')
        .eq('tenant_id', tenantId)
        .eq('status', 'SUCCESS')
        .limit(1000);

      if (txErr) {
        console.warn('[CustomerController] transactions_log query failed:', txErr.message);
      }

      const pendingByVa = computePendingFundsByVa(txns || []);

      const list = [];

      for (const c of (customers || [])) {
        const va = String(c.virtual_account_number || '').trim();
        const pendingBalance = pendingByVa.get(va) ?? 0;

        list.push({
          id: c.id,
          name: c.name,
          phone: c.phone || 'N/A',
          email: c.email || 'N/A',
          accountNumber: c.virtual_account_number,
          bankName: c.virtual_account_bank || 'Quasar Sandbox Bank',
          accountName: c.virtual_account_name || c.name,
          holderType: 'Customer',
          balance: pendingBalance
        });
      }

      for (const s of (staff || [])) {
        const va = String(s.virtual_account_number || '').trim();
        const pendingBalance = pendingByVa.get(va) ?? 0;

        list.push({
          id: s.id,
          name: s.name,
          phone: s.phone || 'N/A',
          email: s.email || 'N/A',
          accountNumber: s.virtual_account_number,
          bankName: s.virtual_account_bank || 'Quasar Sandbox Bank',
          accountName: s.virtual_account_name || `${s.name} (Staff)`,
          holderType: 'Staff',
          balance: pendingBalance
        });
      }

      return res.status(200).json(list);
    } catch (error: any) {
      console.error('[CustomerController] listTenantVirtualAccounts Error:', error.message);
      return res.status(500).json({ error: "Failed to list tenant virtual accounts" });
    }
  }

  static async getVirtualAccountTransactions(req: Request, res: Response) {
    try {
      const { accountNumber } = req.params;
      const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
      if (!accountNumber) return res.status(400).json({ error: "accountNumber is required" });

      const va = String(accountNumber).trim();

      // Pull successful txs for this tenant, then match to the staff VA in metadata.
      const { data: txns, error } = await supabaseAdmin
        .from('transactions_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'SUCCESS')
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) {
        console.error('[CustomerController] Error fetching virtual account transactions:', error.message);
        return res.status(500).json({ error: "Failed to fetch transactions" });
      }

      return res.status(200).json(WebHookFormatVaTxns(txns || [], va));
    } catch (error: any) {
      console.error('[CustomerController] getVirtualAccountTransactions Error:', error.message);
      return res.status(500).json({ error: "Failed to fetch virtual account transactions" });
    }
  }

  static async sweepVirtualAccountFunds(req: Request, res: Response) {
    try {
      const { accountNumber } = req.params;
      const { amount } = req.body;
      const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
      if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid sweep amount" });

      const { data: wallet, error: walletErr } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (walletErr || !wallet) {
        return res.status(404).json({ error: "Tenant wallet not found" });
      }

      const newBalance = Number(wallet.balance) + Number(amount);

      const { error: updateErr } = await supabaseAdmin
        .from('wallets')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (updateErr) throw updateErr;

      const idempotencyKey = crypto.randomUUID();
      const reference = `SWEEP-VA-${accountNumber.substring(0, 6)}`;
      const entries = [
        {
          account: 'USER_WALLET',
          type: 'CREDIT',
          amount: Math.round(Number(amount))
        },
        {
          account: 'EXTERNAL_BANK',
          type: 'DEBIT',
          amount: Math.round(Number(amount))
        }
      ];

      await supabaseAdmin.rpc('process_ledger_double_entry', {
        p_tenant_id: tenantId,
        p_idempotency_key: idempotencyKey,
        p_reference: reference,
        p_entries: entries,
        p_metadata: { source: 'virtual_account_sweep', accountNumber }
      });

      // Persist sweep against this VA so pending funds can be reduced accurately
      await supabaseAdmin.from('transactions_log').insert({
        reference,
        tenant_id: tenantId,
        wallet_id: wallet.id,
        amount: Math.round(Number(amount)),
        type: 'SWEEP',
        provider: 'quasar',
        status: 'SUCCESS',
        metadata: {
          virtualAccountNumber: accountNumber,
          accountNumber,
          source: 'virtual_account_sweep',
        },
      });

      return res.status(200).json({
        success: true,
        message: `Successfully swept ₦${amount.toFixed(2)} to internal wallet`,
        newBalance
      });
    } catch (error: any) {
      console.error('[CustomerController] sweepVirtualAccountFunds Error:', error.message);
      return res.status(500).json({ error: "Failed to sweep virtual account funds" });
    }
  }
}

/** Match SUCCESS txs to a staff VA number across Quasar metadata key variants. */
function extractVaFromMetadata(meta: any): string | null {
  if (!meta || typeof meta !== 'object') return null;
  const candidates = [
    meta.virtualAccountNumber,
    meta.accountNumber,
    meta.virtual_account_number,
    meta.account_number,
    meta?.metadata?.virtualAccountNumber,
    meta?.metadata?.accountNumber,
  ]
    .filter(Boolean)
    .map((v: any) => String(v).trim());
  return candidates[0] || null;
}

/**
 * Pending funds per VA = inbound CREDIT/DEPOSIT − SWEEP/DEBIT outflows.
 * No hardcoded demo balances.
 */
function computePendingFundsByVa(txns: any[]): Map<string, number> {
  const inbound = new Set([
    'CREDIT',
    'DEPOSIT',
    'INWARD',
    'INWARD_PAYMENT',
    'VIRTUAL_ACCOUNT_CREDIT',
  ]);
  const outbound = new Set(['SWEEP', 'DEBIT', 'WITHDRAWAL']);
  const map = new Map<string, number>();

  for (const tx of txns || []) {
    const va = extractVaFromMetadata(tx.metadata);
    if (!va) continue;
    const amount = Number(tx.amount) || 0;
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const type = String(tx.type || '').toUpperCase();
    const current = map.get(va) || 0;
    if (inbound.has(type) || type === '') {
      map.set(va, current + amount);
    } else if (outbound.has(type)) {
      map.set(va, Math.max(0, current - amount));
    }
  }
  return map;
}

function WebHookFormatVaTxns(txns: any[], accountNumber: string) {
  const va = String(accountNumber).trim();
  const inboundTypes = new Set([
    'CREDIT',
    'DEPOSIT',
    'INWARD',
    'INWARD_PAYMENT',
    'VIRTUAL_ACCOUNT_CREDIT',
    '',
  ]);

  const matched = (txns || []).filter((tx) => {
    const rawType = String(tx.type ?? '').toUpperCase();
    if (!inboundTypes.has(rawType)) return false;

    const meta = tx.metadata || {};
    const candidates = [
      meta.virtualAccountNumber,
      meta.accountNumber,
      meta.virtual_account_number,
      meta.account_number,
      meta?.metadata?.virtualAccountNumber,
      meta?.metadata?.accountNumber,
    ]
      .filter(Boolean)
      .map((v: any) => String(v).trim());
    return candidates.includes(va);
  });

  return matched.map((tx) => {
    const rawType = String(tx.type || 'CREDIT').toUpperCase();
    const normalizedType =
      rawType === 'DEPOSIT' || rawType === 'INWARD' || rawType === 'VIRTUAL_ACCOUNT_CREDIT' || rawType === ''
        ? 'CREDIT'
        : rawType;
    return {
      id: tx.id,
      amount: Number(tx.amount),
      type: normalizedType,
      reference: tx.reference,
      status: tx.status,
      createdAt: tx.created_at,
      metadata: tx.metadata || {},
    };
  });
}
