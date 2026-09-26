// src/controllers/finance.controller.ts
import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../db/supabase';
import { classifyInvoicePaymentMethod } from '../utils/invoice-payment-method';
import { collectedInvoiceAmount, outstandingInvoiceAmount } from '../utils/invoice-collection';
import { resolveTenantScope } from '../utils/resolve-tenant-scope';
import {
  roundNaira,
  splitUnsweptVirtualAccountFunds,
  sumQuasarSandboxBalancesNaira,
  transactionAmountNaira,
} from '../utils/virtual-account-funds';
import { WalletService } from '../services/wallet.service';
import { QfsQuasarBridgeService } from '../services/qfs-quasar-bridge.service';

export class ExecutiveFinanceController {
  /**
   * GET /api/finance/executive-summary
   * Returns a high-level financial overview for school executives.
   */
  static async getSummary(req: Request, res: Response) {
    const tenantId = resolveTenantScope(req);
    const { startDate, endDate } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    try {
      // 2. Query and aggregate from the invoices table
      let invoiceQuery = supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('tenant_id', tenantId);

      if (startDate) invoiceQuery = invoiceQuery.gte('created_at', startDate);
      if (endDate) invoiceQuery = invoiceQuery.lte('created_at', endDate);

      const [
        walletRes,
        invoicesRes,
        allInvoicesRes,
        payoutsRes,
        quasarCreditsRes,
        quasarSweepsRes,
        studentsRes,
        customersRes,
        unmatchedRes,
        failedPayoutsRes,
        customerVaRes,
        staffVaRes,
        studentVaRes,
      ] = await Promise.all([
        supabaseAdmin.from('wallets').select('id, balance').eq('tenant_id', tenantId).maybeSingle(),
        invoiceQuery,
        supabaseAdmin.from('invoices').select('customer_id, amount_paid, payment_method, payment_status, total_amount, created_at').eq('tenant_id', tenantId),
        supabaseAdmin.from('transactions_log').select('amount').eq('tenant_id', tenantId).eq('type', 'payout').eq('status', 'SUCCESS'),
        supabaseAdmin
          .from('transactions_log')
          .select('amount, type, reference, metadata')
          .eq('tenant_id', tenantId)
          .eq('status', 'SUCCESS')
          .in('type', ['CREDIT', 'DEPOSIT', 'INWARD', 'INWARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT']),
        supabaseAdmin
          .from('transactions_log')
          .select('amount, type, reference, metadata')
          .eq('tenant_id', tenantId)
          .eq('status', 'SUCCESS')
          .in('type', ['SWEEP', 'DEBIT', 'WITHDRAWAL']),
        supabaseAdmin.from('students').select('id, admission_number, running_balance').eq('school_id', tenantId),
        supabaseAdmin.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabaseAdmin.from('transactions_log').select('id').eq('tenant_id', tenantId).eq('status', 'PENDING').is('metadata->studentId', null),
        supabaseAdmin.from('transactions_log').select('id').eq('tenant_id', tenantId).eq('status', 'FAILED').eq('type', 'payout'),
        supabaseAdmin
          .from('customers')
          .select('virtual_account_number')
          .eq('tenant_id', tenantId)
          .not('virtual_account_number', 'is', null),
        supabaseAdmin
          .from('users')
          .select('virtual_account_number')
          .eq('tenant_id', tenantId)
          .not('virtual_account_number', 'is', null),
        supabaseAdmin
          .from('students')
          .select('virtual_account_number')
          .eq('school_id', tenantId)
          .not('virtual_account_number', 'is', null),
      ]);

      const wallet = walletRes.data;
      let derivedWalletBalance = Number(wallet?.balance || 0);
      try {
        const derived = await WalletService.getBalance(tenantId);
        if (Number.isFinite(Number(derived?.balance))) {
          derivedWalletBalance = Number(derived.balance);
        }
      } catch {
        /* keep cached wallets.balance */
      }
      const invoices = invoicesRes.data;
      const allInvoices = allInvoicesRes.data;
      const payouts = payoutsRes.data;
      const quasarCredits = quasarCreditsRes.data;
      const quasarSweeps = quasarSweepsRes.data;
      const students = studentsRes.data;
      const custCount = customersRes.count;
      const unmatched = unmatchedRes.data;
      const failedPayouts = failedPayoutsRes.data;

      let totalInvoiced = 0;
      let totalCollected = 0;
      let totalPending = 0;
      let card = 0;
      let vaTransfer = 0;
      let bankTransfer = 0;
      let cash = 0;
      let walletAmount = 0;
      const invoiceCount = invoices?.length || 0;

      for (const inv of (invoices || [])) {
        const amt = Number(inv.total_amount || 0);
        const collected = collectedInvoiceAmount(inv);
        totalInvoiced += amt;
        totalCollected += collected;
        totalPending += outstandingInvoiceAmount(inv);

        const rail = classifyInvoicePaymentMethod(inv.payment_method);
        if (rail === 'cash') {
          cash += collected;
        } else if (rail === 'va_transfer') {
          vaTransfer += collected;
        } else if (rail === 'bank_transfer') {
          bankTransfer += collected;
        } else if (rail === 'card') {
          card += collected;
        } else if (rail === 'wallet') {
          walletAmount += collected;
        }
      }

      try {
        const { data: schoolPays } = await supabaseAdmin
          .from('school_payment_events')
          .select('amount, payment_method, local_invoice_number, payment_status, paid_at')
          .eq('tenant_id', tenantId);
        const invoiceNumbers = new Set(
          (invoices || []).map((inv: any) => String(inv.invoice_number || '').trim()).filter(Boolean),
        );
        for (const pay of schoolPays || []) {
          const num = String(pay.local_invoice_number || '').trim();
          if (num && invoiceNumbers.has(num)) continue;
          const rail = classifyInvoicePaymentMethod(pay.payment_method);
          const amt = Number(pay.amount || 0);
          if (!(amt > 0)) continue;
          if (rail === 'cash') {
            cash += amt;
            totalCollected += amt;
            totalInvoiced += amt;
          }
        }
      } catch (schoolPayErr: any) {
        console.warn('[ExecutiveFinance] school_payment_events skip:', schoolPayErr?.message || schoolPayErr);
      }

      const allTimeCollected = allInvoices?.reduce((sum, inv) => sum + collectedInvoiceAmount(inv), 0) || 0;

      // Only card/POS + Quasar VA invoices. Tenant personal-bank transfers stay out.
      let totalQuasarFromCardInvoices = 0;
      for (const inv of (allInvoices || [])) {
        const collected = collectedInvoiceAmount(inv);
        const rail = classifyInvoicePaymentMethod(inv.payment_method);
        if (rail === 'card') totalQuasarFromCardInvoices += collected;
      }

      // Live Quasar VA / webhook deposits (dedupe by reference)
      const seenCreditRefs = new Set<string>();
      let totalQuasarFromDeposits = 0;
      for (const tx of (quasarCredits || [])) {
        const ref = String(tx.reference || '').trim();
        if (ref) {
          if (seenCreditRefs.has(ref)) continue;
          seenCreditRefs.add(ref);
        }
        const amount = transactionAmountNaira(tx);
        if (amount > 0) totalQuasarFromDeposits += amount;
      }

      const totalQuasarRemitted = payouts?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
      let parentEntities: any[] = [];
      try {
        const parentVaRes = await supabaseAdmin
          .from('school_entities')
          .select('payload')
          .eq('tenant_id', tenantId)
          .in('entity_type', ['parent_virtual_account', 'parent']);
        parentEntities = parentVaRes.data || [];
      } catch {
        parentEntities = [];
      }
      const parentVas = parentEntities
        .map((row: any) => {
          const p = row?.payload && typeof row.payload === 'object' ? row.payload : {};
          return String(p.accountNumber || p.virtualAccountNumber || p.virtual_account_number || '').trim();
        })
        .filter(Boolean);
      const unsweptVa = splitUnsweptVirtualAccountFunds({
        transactions: [...(quasarCredits || []), ...(quasarSweeps || [])],
        customerVas: (customerVaRes.data || []).map((row: any) => row.virtual_account_number),
        staffVas: (staffVaRes.data || []).map((row: any) => row.virtual_account_number),
        studentVas: (studentVaRes.data || []).map((row: any) => row.virtual_account_number),
        parentVas,
      });
      let pendingVirtualAccountFunds = unsweptVa.total;
      try {
        const sandboxAccounts = await QfsQuasarBridgeService.listAccounts(tenantId);
        const quasarLive = sumQuasarSandboxBalancesNaira(sandboxAccounts || []);
        // Prefer Quasar's live VA total when Invify's log still has truncated naira (2.50 → 2).
        if (quasarLive > pendingVirtualAccountFunds + 0.009) {
          pendingVirtualAccountFunds = quasarLive;
        }
      } catch (err: any) {
        console.warn('[ExecutiveFinance] Quasar live VA total unavailable:', err?.message || err);
      }
      pendingVirtualAccountFunds = roundNaira(pendingVirtualAccountFunds);
      // Held is money still sitting at Quasar now (unswept VA + unremitted card).
      // Do not floor that with all-time deposit totals — those stay in "In".
      const pendingQuasarRemittance = Math.max(
        0,
        roundNaira(pendingVirtualAccountFunds + totalQuasarFromCardInvoices - totalQuasarRemitted),
      );
      const totalQuasarCollected = roundNaira(totalQuasarFromDeposits + totalQuasarFromCardInvoices);

      let totalCount = 0;
      let owingCount = 0;
      let paidCount = 0;

      if (students && students.length > 0) {
        // Dedupe twin sync rows (same admission / name+class) before counting.
        const seen = new Set<string>();
        const unique = students.filter((s: any) => {
          const adm = String(s.admission_number || '').trim().toLowerCase();
          const key = adm
            ? `adm:${adm}`
            : `id:${s.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        totalCount = unique.length;
        // App convention: balance > 0 = owing, balance < 0 = credit
        owingCount = unique.filter((s: any) => Number(s.running_balance || 0) > 0).length;
        paidCount = Math.max(0, totalCount - owingCount);
      } else {
        const customerInvoiceMap = new Map<string, string[]>();
        allInvoices?.forEach((inv: any) => {
          if (inv.customer_id) {
            if (!customerInvoiceMap.has(inv.customer_id)) {
              customerInvoiceMap.set(inv.customer_id, []);
            }
            customerInvoiceMap.get(inv.customer_id)!.push(inv.payment_status || 'Unpaid');
          }
        });
        
        totalCount = custCount || 0;
        customerInvoiceMap.forEach((statuses) => {
          const hasUnpaid = statuses.some(s => s.toLowerCase() !== 'paid');
          if (hasUnpaid) owingCount++;
        });
        paidCount = Math.max(0, totalCount - owingCount);
      }

      return res.status(200).json({
        walletBalance: derivedWalletBalance,
        totalCollected: allTimeCollected + totalQuasarFromDeposits,
        revenueInRange: totalCollected,
        /** All-time Quasar inflows (VA deposits + card invoices). Own-bank transfers excluded. */
        totalQuasarCollected,
        /** Successful remittances / payouts to merchant */
        totalQuasarRemitted,
        /** Still to remit = Quasar collections − remitted */
        pendingQuasarRemittance,
        /** VA credits not yet swept into tenant wallet (already on a customer or staff VA) */
        pendingVirtualAccountFunds,
        unsweptVirtualAccount: {
          total: unsweptVa.total,
          customer: unsweptVa.customer,
          staff: unsweptVa.staff,
          student: unsweptVa.student,
          parent: unsweptVa.parent,
          unmapped: unsweptVa.unmapped,
        },
        salesSummary: {
          totalInvoiced,
          totalCollected,
          totalPending,
          card,
          vaTransfer,
          bankTransfer,
          transfer: bankTransfer,
          cash,
          wallet: walletAmount,
          cardAndTransfer: card + vaTransfer,
          invoiceCount
        },
        studentMetrics: {
          total: totalCount,
          paid: paidCount,
          owing: owingCount
        },
        alerts: {
          unmatchedCount: unmatched?.length || 0,
          failedPayoutsCount: failedPayouts?.length || 0
        }
      });
    } catch (error: any) {
      console.error('[ExecutiveFinanceController] Error:', error.message);
      return res.status(500).json({ error: 'Failed to generate executive summary' });
    }
  }

  /**
   * GET /api/finance/school-dashboard
   * School Finance Dashboard: total revenue plus Quasar card + VA transfer.
   */
  static async getSchoolDashboard(req: Request, res: Response) {
    let payload: any;
    const capture = {
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: any) {
        payload = body;
        return this;
      },
      statusCode: 200,
    };
    await ExecutiveFinanceController.getSummary(req, capture as unknown as Response);
    if (!payload || payload.error) {
      return res.status(capture.statusCode || 500).json(payload || { error: 'Failed to load dashboard' });
    }
    const sales = payload.salesSummary || {};
    const card = Number(sales.card || 0);
    const invoiceVa = Number(sales.vaTransfer || 0);
    const liveVa = Number(payload.pendingVirtualAccountFunds || 0);
    const vaTransfer = Math.max(invoiceVa, liveVa);
    return res.status(200).json({
      ...payload,
      totalRevenue: payload.totalCollected,
      outstandingFees: sales.totalPending || 0,
      paidStudentsCount: payload.studentMetrics?.paid || 0,
      owingStudentsCount: payload.studentMetrics?.owing || 0,
      totalStudents: payload.studentMetrics?.total || 0,
      lastUpdated: new Date().toISOString(),
      cardCollected: card,
      vaTransferCollected: vaTransfer,
      cashCollected: Number(sales.cash || 0),
      /** Quasar on this page is collectively card (POS) + VA transfer. */
      quasarCollected: card + vaTransfer,
    });
  }

  /**
   * GET /api/finance/daily-revenue?days=7
   * Invoice collections + Quasar VA credits grouped by day.
   */
  static async getDailyRevenue(req: Request, res: Response) {
    const tenantId = resolveTenantScope(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);

      const lagosDay = (iso?: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
        return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
      };

      const [invoicesRes, creditsRes] = await Promise.all([
        supabaseAdmin
          .from('invoices')
          .select('id, invoice_number, amount_paid, payment_status, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .gte('created_at', since.toISOString()),
        supabaseAdmin
          .from('transactions_log')
          .select('amount, type, status, metadata, created_at, reference')
          .eq('tenant_id', tenantId)
          .eq('status', 'SUCCESS')
          .in('type', ['CREDIT', 'DEPOSIT', 'INWARD', 'INWARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT'])
          .gte('created_at', since.toISOString()),
      ]);

      const byDay = new Map<string, number>();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
        byDay.set(key, 0);
      }

      const add = (iso: string | undefined, amount: number) => {
        if (!(amount > 0) || !iso) return;
        const key = lagosDay(iso);
        if (!byDay.has(key)) return;
        byDay.set(key, (byDay.get(key) || 0) + amount);
      };

      const invoiceIds = new Set<string>();
      const invoiceNumbers = new Set<string>();
      for (const inv of invoicesRes.data || []) {
        if (inv.id) invoiceIds.add(String(inv.id));
        if (inv.invoice_number) invoiceNumbers.add(String(inv.invoice_number));
        add(inv.updated_at || inv.created_at, collectedInvoiceAmount(inv));
      }
      for (const tx of creditsRes.data || []) {
        const meta = tx.metadata || {};
        const linkedId = String(meta.invoice_id || meta.invoiceId || '');
        const linkedNo = String(meta.invoice_number || meta.invoiceNumber || '');
        if (linkedId && invoiceIds.has(linkedId)) continue;
        if (linkedNo && invoiceNumbers.has(linkedNo)) continue;
        add(tx.created_at, transactionAmountNaira(tx));
      }

      return res.status(200).json(
        Array.from(byDay.entries()).map(([date, revenue]) => ({
          date,
          revenue: roundNaira(revenue),
        })),
      );
    } catch (error: any) {
      console.error('[ExecutiveFinanceController] getDailyRevenue Error:', error.message);
      return res.status(500).json({ error: 'Failed to load daily revenue' });
    }
  }

  /**
   * GET /api/finance/transactions
   * Live school feed: paid invoices (incl. card/POS) + Quasar VA credits.
   */
  static async getSchoolTransactions(req: Request, res: Response) {
    const tenantId = resolveTenantScope(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
    try {
      const [invoicesRes, creditsRes] = await Promise.all([
        supabaseAdmin
          .from('invoices')
          .select(
            'id, invoice_number, customer_name, amount_paid, payment_method, payment_status, created_at, student_id, customer_id',
          )
          .eq('tenant_id', tenantId)
          .gt('amount_paid', 0)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabaseAdmin
          .from('transactions_log')
          .select('id, reference, amount, type, metadata, created_at, wallet_id')
          .eq('tenant_id', tenantId)
          .eq('status', 'SUCCESS')
          .in('type', ['CREDIT', 'DEPOSIT', 'INWARD', 'INWARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT'])
          .order('created_at', { ascending: false })
          .limit(limit),
      ]);

      const channelForRail = (rail: string) => {
        if (rail === 'card') return 'Card';
        if (rail === 'va_transfer') return 'Transfer';
        if (rail === 'bank_transfer') return 'Bank';
        if (rail === 'cash') return 'Cash';
        if (rail === 'wallet') return 'Wallet';
        return 'Other';
      };

      const items: any[] = [];
      for (const inv of invoicesRes.data || []) {
        const collected = collectedInvoiceAmount(inv);
        if (!(collected > 0)) continue;
        const rail = classifyInvoicePaymentMethod(inv.payment_method);
        items.push({
          id: inv.id,
          wallet_id: inv.student_id || inv.customer_id || 'school',
          amount: collected,
          type: 'credit',
          reference: inv.invoice_number,
          description: `Fee Payment #${inv.invoice_number || inv.id} for ${inv.customer_name || 'Customer'}`,
          balance_after: 0,
          channel: channelForRail(rail),
          created_at: inv.created_at,
          metadata: {
            student_id: inv.student_id,
            student_name: inv.customer_name,
            payment_method: inv.payment_method,
            quasar: rail === 'card' || rail === 'va_transfer',
          },
        });
      }

      for (const tx of creditsRes.data || []) {
        const amount = transactionAmountNaira(tx);
        if (!(amount > 0)) continue;
        const meta = tx.metadata || {};
        const name = meta.senderName || meta.studentName || 'Virtual Account credit';
        const parentOwned = String(meta.paidVia || meta.paid_via || '').toLowerCase().includes('parent');
        items.push({
          id: tx.id,
          wallet_id: tx.wallet_id || 'quasar',
          amount,
          type: 'credit',
          reference: tx.reference || String(tx.id),
          description: parentOwned
            ? `Parent transfer (Quasar) · ${name}`
            : `Quasar VA credit · ${name}`,
          balance_after: 0,
          channel: 'Quasar',
          created_at: tx.created_at,
          metadata: {
            student_name: name,
            student_id: meta.studentId || meta.student_id || '',
            virtualAccountNumber:
              meta.virtualAccountNumber || meta.accountNumber || meta.virtual_account_number || null,
            quasar: true,
            parentTransfer: parentOwned,
          },
        });
      }

      items.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      return res.status(200).json(items.slice(0, limit));
    } catch (error: any) {
      console.error('[ExecutiveFinanceController] getSchoolTransactions Error:', error.message);
      return res.status(500).json({ error: 'Failed to load transactions' });
    }
  }

  /**
   * GET /api/finance/payouts/stats
   * Returns global system aggregates for payouts/settlements
   */
  static async getPayoutStats(req: Request, res: Response) {
    try {
      const tenantId = resolveTenantScope(req);

      let creditsQuery = supabaseAdmin
        .from('ledger_entries')
        .select('amount')
        .in('entry_type', ['CARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT'])
        .eq('type', 'CREDIT');

      let debitsQuery = supabaseAdmin
        .from('ledger_entries')
        .select('amount')
        .eq('entry_type', 'WITHDRAWAL')
        .eq('type', 'DEBIT');

      let disputesQuery = supabaseAdmin
        .from('reconciliation_cases')
        .select('difference_amount')
        .in('status', ['PENDING', 'INVESTIGATING', 'ESCALATED']);

      let failedQuery = supabaseAdmin
        .from('reconciliation_cases')
        .select('id')
        .eq('status', 'FAILED');

      if (tenantId) {
        creditsQuery = creditsQuery.eq('tenant_id', tenantId);
        debitsQuery = debitsQuery.eq('tenant_id', tenantId);
        disputesQuery = disputesQuery.eq('tenant_id', tenantId);
        failedQuery = failedQuery.eq('tenant_id', tenantId);
      }

      const [creditsRes, debitsRes, disputesRes, failedRes, walletInfo] = await Promise.all([
        creditsQuery,
        debitsQuery,
        disputesQuery,
        failedQuery,
        tenantId ? WalletService.getBalance(tenantId) : Promise.resolve(null),
      ]);

      if (creditsRes.error) console.error('Error fetching credits:', creditsRes.error);
      if (debitsRes.error) console.error('Error fetching debits:', debitsRes.error);
      if (disputesRes.error) console.error('Error fetching disputes:', disputesRes.error);
      if (failedRes.error) console.error('Error fetching failed cases:', failedRes.error);

      const totalCredits = creditsRes.data?.reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0) || 0;
      const totalDebits = debitsRes.data?.reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0) || 0;

      // VA webhook credits land on USER_WALLET, not entry_type=VIRTUAL_ACCOUNT_CREDIT.
      const pendingSettlement = Math.max(
        0,
        walletInfo && Number.isFinite(Number(walletInfo.balance))
          ? Number(walletInfo.balance)
          : totalCredits - totalDebits,
      );
      const clearedToday = totalDebits;
      const heldFunds = disputesRes.data?.reduce((acc: number, curr: any) => acc + Number(curr.difference_amount || 0), 0) || 0;
      const failedTransfers = failedRes.data?.length || 0;

      return res.status(200).json({
        pendingSettlement,
        clearedToday,
        heldFunds,
        failedTransfers
      });
    } catch (error: any) {
      console.error('[ExecutiveFinanceController] getPayoutStats Error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch payout stats' });
    }
  }

  /**
   * GET /api/v1/finance/settlement-phases
   * Returns a chronological timeline of settlement events derived from actual ledger/settlement records.
   */
  static async getSettlementPhases(req: Request, res: Response) {
    const tenantId = resolveTenantScope(req);
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

    try {
      // p10 ledger_entries columns: id, ledger_id, tenant_id, account, type, amount, currency, created_at
      const { data, error } = await supabaseAdmin
        .from('ledger_entries')
        .select('id, account, type, amount, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.warn('[ExecutiveFinanceController] getSettlementPhases ledger skip:', error.message);
        return res.status(200).json([]);
      }

      const phasesMap = new Map<string, any>();

      data?.forEach((entry: any) => {
        const account = String(entry.account || 'SYSTEM');
        const phaseCode =
          account === 'QUASAR_CLEARING' ? 'QUASAR_POS'
          : account === 'EXTERNAL_BANK' ? 'TREASURY_PAYOUT'
          : account === 'USER_WALLET' ? 'CUSTOMER_WALLET'
          : account;

        if (!phasesMap.has(phaseCode)) {
          const kobo = Number(entry.amount || 0);
          const naira = kobo >= 1000 ? kobo / 100 : kobo;
          phasesMap.set(phaseCode, {
            title: phaseCode.toUpperCase().replace(/_/g, ' ') + ' BATCHING',
            desc: `Last ${entry.type || 'ENTRY'}: ₦${naira.toFixed(2)}`,
            active: true,
            timestamp: entry.created_at,
          });
        }
      });

      const phases = Array.from(phasesMap.values()).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      return res.status(200).json(phases);
    } catch (error: any) {
      console.error('[ExecutiveFinanceController] getSettlementPhases Error:', error.message);
      return res.status(200).json([]);
    }
  }

  static async getQuasarTransactions(req: Request, res: Response) {
    const tenantId = resolveTenantScope(req);
    const { date } = req.query; // YYYY-MM-DD format

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    try {
      const queryDate = date ? String(date) : new Date().toISOString().split('T')[0];
      const start = `${queryDate}T00:00:00.000Z`;
      const end = `${queryDate}T23:59:59.999Z`;

      const { data, error } = await supabaseAdmin
        .from('transactions_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return res.status(200).json({ success: true, date: queryDate, data });
    } catch (error: any) {
      console.error('[ExecutiveFinanceController] getQuasarTransactions Error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch Quasar transactions' });
    }
  }

  /**
   * GET /api/finance/missed-payments?since=ISO8601
   * Returns SUCCESS inbound credits for this tenant since [since],
   * so offline devices can catch up wallet credits + local notifications on reconnect.
   */
  static async getMissedPayments(req: Request, res: Response) {
    const tenantId = resolveTenantScope(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    try {
      const sinceRaw = typeof req.query.since === 'string' ? req.query.since : '';
      const sinceDate = sinceRaw ? new Date(sinceRaw) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (Number.isNaN(sinceDate.getTime())) {
        return res.status(400).json({ error: 'Invalid since timestamp' });
      }

      // Cap lookback to 30 days to keep payloads small
      const maxLookback = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const since = sinceDate < maxLookback ? maxLookback : sinceDate;

      const { data, error } = await supabaseAdmin
        .from('transactions_log')
        .select('id, reference, amount, type, status, metadata, created_at, wallet_id')
        .eq('tenant_id', tenantId)
        .eq('status', 'SUCCESS')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) throw error;

      const inboundTypes = new Set([
        'CREDIT',
        'DEPOSIT',
        'INWARD',
        'INWARD_PAYMENT',
        'VIRTUAL_ACCOUNT_CREDIT',
        '',
      ]);

      const payments = (data || [])
        .filter((tx: any) => inboundTypes.has(String(tx.type || '').toUpperCase()))
        .map((tx: any) => {
          const meta = tx.metadata || {};
          return {
            id: tx.id,
            reference: tx.reference,
            amount: transactionAmountNaira(tx),
            type: 'payment.success',
            status: tx.status,
            createdAt: tx.created_at,
            walletId: tx.wallet_id,
            customerId: meta.customerId || meta.customer_id || null,
            metadata: {
              virtualAccountNumber:
                meta.virtualAccountNumber ||
                meta.accountNumber ||
                meta.virtual_account_number ||
                null,
              accountNumber:
                meta.accountNumber ||
                meta.virtualAccountNumber ||
                meta.virtual_account_number ||
                null,
              senderName: meta.senderName || meta.studentName || 'Unknown Sender',
              studentName: meta.studentName || meta.senderName || 'Unknown Sender',
              senderBank: meta.senderBank || meta.bankName || '',
              sandbox: meta.sandbox === true,
              paidVia: meta.paidVia || null,
              parentKey: meta.parentKey || meta.customerId || meta.customer_id || null,
              amountNaira: transactionAmountNaira(tx),
            },
          };
        });

      return res.status(200).json({
        success: true,
        since: since.toISOString(),
        count: payments.length,
        data: payments,
      });
    } catch (error: any) {
      console.error('[ExecutiveFinanceController] getMissedPayments Error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch missed payments' });
    }
  }

  /**
   * GET /api/finance/student/:studentId/summary
   * School-mode ledger summary for one student / parent key.
   */
  static async getStudentSummary(req: Request, res: Response) {
    const tenantId = resolveTenantScope(req);
    const studentId = String(req.params.studentId || '').trim();
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });
    if (!studentId) return res.status(400).json({ error: 'Student ID is required' });

    try {
      const { data: invoices, error } = await supabaseAdmin
        .from('invoices')
        .select('amount_paid, total_amount, balance_due, payment_status, student_id, customer_id')
        .eq('tenant_id', tenantId)
        .or(`student_id.eq.${studentId},customer_id.eq.${studentId}`);
      if (error) throw error;

      let totalPaid = 0;
      let outstandingBalance = 0;
      for (const inv of invoices || []) {
        totalPaid += collectedInvoiceAmount(inv);
        outstandingBalance += outstandingInvoiceAmount(inv);
      }
      totalPaid = roundNaira(totalPaid);
      outstandingBalance = roundNaira(Math.max(0, outstandingBalance));
      const totalFees = roundNaira(totalPaid + outstandingBalance);

      let currentBalance = 0;
      try {
        const { data: customer } = await supabaseAdmin
          .from('customers')
          .select('wallet_balance, balance')
          .eq('tenant_id', tenantId)
          .or(`id.eq.${studentId},external_id.eq.${studentId}`)
          .maybeSingle();
        currentBalance = roundNaira(
          Number(customer?.wallet_balance ?? customer?.balance ?? 0),
        );
      } catch {
        currentBalance = 0;
      }

      return res.status(200).json({
        totalFees,
        totalPaid,
        outstandingBalance,
        currentBalance,
        studentId,
      });
    } catch (error: any) {
      console.error('[ExecutiveFinanceController] getStudentSummary Error:', error.message);
      return res.status(500).json({ error: 'Failed to load student summary' });
    }
  }

  /**
   * GET /api/finance/student/:studentId/transactions
   */
  static async getStudentTransactions(req: Request, res: Response) {
    const tenantId = resolveTenantScope(req);
    const studentId = String(req.params.studentId || '').trim();
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });
    if (!studentId) return res.status(400).json({ error: 'Student ID is required' });

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    try {
      const [invoicesRes, creditsRes] = await Promise.all([
        supabaseAdmin
          .from('invoices')
          .select(
            'id, invoice_number, customer_name, amount_paid, payment_method, payment_status, created_at, student_id, customer_id',
          )
          .eq('tenant_id', tenantId)
          .or(`student_id.eq.${studentId},customer_id.eq.${studentId}`)
          .gt('amount_paid', 0)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabaseAdmin
          .from('transactions_log')
          .select('id, reference, amount, type, metadata, created_at, wallet_id')
          .eq('tenant_id', tenantId)
          .eq('status', 'SUCCESS')
          .in('type', ['CREDIT', 'DEPOSIT', 'INWARD', 'INWARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT'])
          .order('created_at', { ascending: false })
          .limit(limit * 2),
      ]);

      const channelForRail = (rail: string) => {
        if (rail === 'card') return 'Card';
        if (rail === 'va_transfer') return 'Transfer';
        if (rail === 'bank_transfer') return 'Bank';
        if (rail === 'cash') return 'Cash';
        if (rail === 'wallet') return 'Wallet';
        return 'Other';
      };

      const items: any[] = [];
      for (const inv of invoicesRes.data || []) {
        const collected = collectedInvoiceAmount(inv);
        if (!(collected > 0)) continue;
        const rail = classifyInvoicePaymentMethod(inv.payment_method);
        items.push({
          id: inv.id,
          wallet_id: inv.student_id || inv.customer_id || studentId,
          amount: collected,
          type: 'credit',
          reference: inv.invoice_number,
          description: `Fee Payment #${inv.invoice_number || inv.id} for ${inv.customer_name || 'Customer'}`,
          balance_after: 0,
          channel: channelForRail(rail),
          created_at: inv.created_at,
          metadata: {
            student_id: inv.student_id || studentId,
            student_name: inv.customer_name,
            payment_method: inv.payment_method,
          },
        });
      }

      for (const tx of creditsRes.data || []) {
        const meta = tx.metadata || {};
        const metaStudent =
          meta.studentId || meta.student_id || meta.customerId || meta.customer_id || meta.parentKey || '';
        const walletMatch = String(tx.wallet_id || '') === studentId;
        const metaMatch = String(metaStudent) === studentId;
        if (!walletMatch && !metaMatch) continue;
        const amount = transactionAmountNaira(tx);
        if (!(amount > 0)) continue;
        const name = meta.senderName || meta.studentName || 'Virtual Account credit';
        items.push({
          id: tx.id,
          wallet_id: tx.wallet_id || studentId,
          amount,
          type: 'credit',
          reference: tx.reference || String(tx.id),
          description: name,
          balance_after: 0,
          channel: 'Transfer',
          created_at: tx.created_at,
          metadata: {
            student_name: name,
            student_id: metaStudent || studentId,
            virtualAccountNumber:
              meta.virtualAccountNumber || meta.accountNumber || meta.virtual_account_number || null,
            quasar: true,
          },
        });
      }

      items.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      return res.status(200).json(items.slice(0, limit));
    } catch (error: any) {
      console.error('[ExecutiveFinanceController] getStudentTransactions Error:', error.message);
      return res.status(500).json({ error: 'Failed to load student transactions' });
    }
  }
}
