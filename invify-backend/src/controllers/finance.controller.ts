// src/controllers/finance.controller.ts
import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../db/supabase';
import { classifyInvoicePaymentMethod } from '../utils/invoice-payment-method';
import { collectedInvoiceAmount, countsTowardSales, outstandingInvoiceAmount } from '../utils/invoice-collection';
import { collectionSummaryFromInvoices } from '../utils/invoice-collection-summary';
import { resolveTenantScope } from '../utils/resolve-tenant-scope';
import { resolveAuthoritativeTenantId } from '../utils/finance-tenant';
import {
  roundNaira,
  splitUnsweptVirtualAccountFunds,
  sumQuasarSandboxBalancesNaira,
  transactionAmountNaira,
} from '../utils/virtual-account-funds';
import { WalletService } from '../services/wallet.service';
import { QfsQuasarBridgeService } from '../services/qfs-quasar-bridge.service';
import { FeeCalculator } from '../modules/fee-orchestration/FeeCalculator';
import {
  isQuasarCreditEntry,
  isSameQuasarCredit,
  quasarEntryTimestamp,
  quasarLedgerAmountNaira,
  quasarLedgerReference,
  QUASAR_RESYNC_DAYS,
  selectQuasarResyncEntries,
} from '../utils/quasar-resync';
import { PaymentAlertTrailService } from '../services/payment-alert-trail.service';
import { postSyncedCreditToWallet } from '../services/payment-alert-quasar-sync';

/** Configured fee in naira, kept to kobo. 102 kobo is ₦1.02. */
function feeNairaFromKobo(finalFeeKobo: number): number {
  const kobo = Number(finalFeeKobo);
  if (!Number.isFinite(kobo) || kobo <= 0) return 0;
  return Number((Math.round(kobo) / 100).toFixed(2));
}

type PublishedChargeVersion = {
  method: 'FLAT' | 'PERCENTAGE' | 'HYBRID';
  percentage_bps: number;
  flat_amount_kobo: number;
  min_fee_kobo: number;
  max_fee_kobo: number;
};

/** Published fee version. Does not change the profile. */
async function publishedFeeVersion(transactionType: string): Promise<PublishedChargeVersion | null> {
  try {
    const { data: profiles, error } = await supabaseAdmin
      .from('fee_profiles')
      .select('id')
      .eq('transaction_type', transactionType)
      .limit(5);
    if (error || !profiles?.length) return null;
    const { data: versions } = await supabaseAdmin
      .from('fee_profile_versions')
      .select('method, percentage_bps, flat_amount_kobo, min_fee_kobo, max_fee_kobo, status')
      .in('profile_id', profiles.map((row) => row.id))
      .eq('status', 'PUBLISHED')
      .limit(1);
    const version = versions?.[0];
    if (!version) return null;
    const method = String(version.method || '');
    if (method !== 'FLAT' && method !== 'PERCENTAGE' && method !== 'HYBRID') return null;
    return {
      method,
      percentage_bps: Number(version.percentage_bps || 0),
      flat_amount_kobo: Number(version.flat_amount_kobo || 0),
      min_fee_kobo: Number(version.min_fee_kobo || 0),
      max_fee_kobo: Number(version.max_fee_kobo || 0),
    };
  } catch (err: any) {
    console.warn(`[ExecutiveFinance] ${transactionType} charge profile skipped:`, err?.message || err);
    return null;
  }
}

async function publishedVaInwardVersion(): Promise<PublishedChargeVersion | null> {
  return publishedFeeVersion('VIRTUAL_ACCOUNT_INWARD_TRANSFER');
}

async function publishedTreasuryWithdrawalVersion(): Promise<PublishedChargeVersion | null> {
  return publishedFeeVersion('TREASURY_WITHDRAWAL');
}

function inwardChargeNaira(
  amountNaira: number,
  version: {
    method: 'FLAT' | 'PERCENTAGE' | 'HYBRID';
    percentage_bps: number;
    flat_amount_kobo: number;
    min_fee_kobo: number;
    max_fee_kobo: number;
  },
): number {
  const kobo = Math.round(Number(amountNaira) * 100);
  if (!Number.isSafeInteger(kobo) || kobo <= 0) return 0;
  try {
    const calc = FeeCalculator.calculate({
      method: version.method,
      transactionAmountKobo: kobo,
      percentageBps: version.percentage_bps,
      flatAmountKobo: version.flat_amount_kobo,
      minFeeKobo: version.min_fee_kobo,
      maxFeeKobo: version.max_fee_kobo,
    });
    return feeNairaFromKobo(calc.final_fee_kobo);
  } catch {
    return 0;
  }
}

/** Billed collections only. Live leftover VA is not school revenue. */
function reportedSchoolRevenue(input: {
  invoiceCollected: number;
  cash: number;
  wallet: number;
  card: number;
  vaTransfer: number;
  quasarHeld: number;
  quasarRemitted: number;
}): number {
  const base = Math.max(
    input.invoiceCollected,
    input.cash + input.wallet + input.card + input.vaTransfer,
  );
  return roundNaira(base);
}

function inwardChargeLine(credit: { id: string; reference: string; created_at: string }, chargeNaira: number) {
  return {
    id: `charge-${credit.id}`,
    wallet_id: 'fee',
    amount: -chargeNaira,
    type: 'debit',
    reference: `charge-${credit.reference}`,
    description: 'Transfer charge',
    balance_after: 0,
    channel: 'Fee',
    created_at: credit.created_at,
    metadata: {
      student_name: 'Transfer charge',
      fee: true,
    },
  };
}

function withdrawalChargeNaira(
  amountNaira: number,
  meta: Record<string, any>,
  version: PublishedChargeVersion | null,
): number {
  const stored = Number(meta.service_fee);
  if (Number.isFinite(stored) && stored > 0) return roundNaira(stored);
  const total = Number(meta.total_required);
  if (Number.isFinite(total) && total > amountNaira) return roundNaira(total - amountNaira);
  if (!version) return 0;
  return inwardChargeNaira(amountNaira, version);
}

function withdrawalChargeLine(
  payout: { id: string; reference: string; created_at: string },
  chargeNaira: number,
) {
  return {
    id: `wd-charge-${payout.id}`,
    wallet_id: 'fee',
    amount: -chargeNaira,
    type: 'debit',
    reference: `charge-${payout.reference}`,
    description: 'Withdrawal charge',
    balance_after: 0,
    channel: 'Fee',
    created_at: payout.created_at,
    metadata: {
      student_name: 'Withdrawal charge',
      fee: true,
      payout: true,
    },
  };
}

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
        supabaseAdmin.from('wallets').select('id, balance').eq('tenant_id', tenantId).limit(1).maybeSingle(),
        invoiceQuery,
        supabaseAdmin.from('invoices').select('customer_id, invoice_number, amount_paid, payment_method, payment_status, total_amount, created_at').eq('tenant_id', tenantId),
        supabaseAdmin.from('transactions_log').select('amount').eq('tenant_id', tenantId).eq('type', 'payout').eq('status', 'SUCCESS'),
        supabaseAdmin
          .from('transactions_log')
          .select('id, amount, type, reference, created_at, metadata')
          .eq('tenant_id', tenantId)
          .eq('status', 'SUCCESS')
          .in('type', ['CREDIT', 'DEPOSIT', 'INWARD', 'INWARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT']),
        supabaseAdmin
          .from('transactions_log')
          .select('id, amount, type, reference, created_at, metadata')
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
      if (!wallet) {
        await WalletService.ensureWallet(tenantId);
      }
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

      const collection = collectionSummaryFromInvoices(invoices, {
        start: startDate ? String(startDate) : null,
        end: endDate ? String(endDate) : null,
      });
      const totalInvoiced = collection.invoiced;
      const totalCollected = collection.recordedCollected;
      const totalPending = collection.pending;
      const card = collection.rails.card;
      const vaTransfer = collection.rails.vaTransfer;
      const bankTransfer = collection.rails.bankTransfer;
      const cash = collection.rails.cash;
      const walletAmount = collection.rails.wallet;
      const invoiceCount = collection.invoiceCount;

      const allTimeCollected = allInvoices?.reduce((sum, inv) => sum + collectedInvoiceAmount(inv), 0) || 0;

      // Only card/POS + Quasar VA invoices. Tenant personal-bank transfers stay out.
      let totalQuasarFromCardInvoices = 0;
      for (const inv of (allInvoices || [])) {
        const collected = collectedInvoiceAmount(inv);
        const rail = classifyInvoicePaymentMethod(inv.payment_method);
        if (rail === 'card') totalQuasarFromCardInvoices += collected;
      }

      // Live Quasar VA / webhook deposits (dedupe by reference AND same VA+amount in a 2-minute window)
      const seenCreditRefs = new Set<string>();
      let totalQuasarFromDeposits = 0;
      for (const tx of (quasarCredits || [])) {
        const amount = transactionAmountNaira(tx);
        if (!(amount > 0)) continue;
        const va = String(
          tx?.metadata?.virtualAccountNumber ||
            tx?.metadata?.accountNumber ||
            tx?.metadata?.virtual_account_number ||
            '',
        ).trim();
        const ref = String(tx.reference || tx.id || '').trim();
        const ts = Date.parse(String(tx.created_at || ''));
        const bucket = Number.isFinite(ts) ? Math.floor(ts / 120000) : String(tx.created_at || '');
        const keys = [
          ref ? `ref:${ref}` : '',
          `fuzzy:${va || 'NOVA'}:${amount}:${bucket}`,
        ].filter(Boolean);
        if (keys.some((k) => seenCreditRefs.has(k))) continue;
        keys.forEach((k) => seenCreditRefs.add(k));
        totalQuasarFromDeposits += amount;
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
      let quasarLiveBalance: number | null = null;
      try {
        const sandboxAccounts = await Promise.race([
          QfsQuasarBridgeService.listAccounts(tenantId),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Quasar live VA timed out')), 4000),
          ),
        ]);
        if (Array.isArray(sandboxAccounts) && sandboxAccounts.length > 0) {
          quasarLiveBalance = sumQuasarSandboxBalancesNaira(sandboxAccounts);
        }
      } catch (err: any) {
        console.warn('[ExecutiveFinance] Quasar live VA total unavailable:', err?.message || err);
      }
      const invifyLoggedVa = roundNaira(pendingVirtualAccountFunds);
      // Quasar is source of truth for what is actually sitting at the PSP.
      // Invify > Quasar means double-posting (tablet sync + webhook) and needs investigation.
      // Quasar > Invify is fine — credits not yet in Invify.
      let quasarBalanceStatus: 'ok' | 'quasar_ahead' | 'invify_overstated' = 'ok';
      if (quasarLiveBalance != null && Number.isFinite(quasarLiveBalance)) {
        if (invifyLoggedVa > quasarLiveBalance + 0.009) {
          quasarBalanceStatus = 'invify_overstated';
          pendingVirtualAccountFunds = quasarLiveBalance;
          console.warn(
            `[ExecutiveFinance] Invify VA log ₦${invifyLoggedVa} > live Quasar ₦${quasarLiveBalance} for tenant ${tenantId} — investigate double sync`,
          );
        } else if (quasarLiveBalance > invifyLoggedVa + 0.009) {
          quasarBalanceStatus = 'quasar_ahead';
          pendingVirtualAccountFunds = quasarLiveBalance;
        } else {
          pendingVirtualAccountFunds = quasarLiveBalance;
        }
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

      let quasarWithdrawable = 0;
      try {
        const { QuasarWithdrawableService } = await import('../services/quasar-withdrawable.service');
        quasarWithdrawable = await QuasarWithdrawableService.available(tenantId);
      } catch (withdrawableErr: any) {
        console.warn('[ExecutiveFinance] withdrawable skip:', withdrawableErr?.message || withdrawableErr);
      }

      const reportedRevenue = reportedSchoolRevenue({
        invoiceCollected: allTimeCollected,
        cash,
        wallet: walletAmount,
        card,
        vaTransfer,
        quasarHeld: pendingVirtualAccountFunds,
        quasarRemitted: totalQuasarRemitted,
      });
      const quasarOnHand = roundNaira(card + pendingVirtualAccountFunds);

      return res.status(200).json({
        walletBalance: derivedWalletBalance,
        withdrawable: quasarWithdrawable,
        totalCollected: allTimeCollected,
        totalRevenue: reportedRevenue,
        quasarCollected: quasarOnHand,
        revenueInRange: totalCollected,
        /** All-time Quasar inflows (VA deposits + card invoices). Own-bank transfers excluded. */
        totalQuasarCollected,
        /** Successful remittances / payouts to merchant */
        totalQuasarRemitted,
        /** Still to remit = Quasar collections − remitted */
        pendingQuasarRemittance,
        /** VA credits not yet swept into tenant wallet (already on a customer or staff VA) */
        pendingVirtualAccountFunds,
        quasarLiveBalance: quasarLiveBalance == null ? null : roundNaira(quasarLiveBalance),
        invifyLoggedVa,
        quasarBalanceStatus,
        unsweptVirtualAccount: {
          total: unsweptVa.total,
          customer: unsweptVa.customer,
          staff: unsweptVa.staff,
          student: unsweptVa.student,
          parent: unsweptVa.parent,
          unmapped: unsweptVa.unmapped,
        },
        salesSummary: {
          timezone: collection.timezone,
          totalInvoiced: roundNaira(totalInvoiced),
          totalCollected: roundNaira(totalCollected),
          recordedCollected: roundNaira(totalCollected),
          totalPending: roundNaira(totalPending),
          card: roundNaira(card),
          vaTransfer: roundNaira(vaTransfer),
          bankTransfer: roundNaira(bankTransfer),
          transfer: roundNaira(bankTransfer),
          cash: roundNaira(cash),
          wallet: roundNaira(walletAmount),
          cardAndTransfer: card + vaTransfer,
          invoiceCount,
          settledFundsNote: collection.settledFundsNote,
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
   * GET /api/v1/finance/invoices/collection-summary
   * Authoritative period totals for Tenant Admin and tablet Invoice History.
   */
  static async getCollectionSummary(req: Request, res: Response) {
    let tenantId: string;
    try {
      tenantId = resolveAuthoritativeTenantId(req);
    } catch (err: any) {
      return res.status(err?.status || 403).json({ error: err?.message || 'Forbidden: Cross-tenant access denied' });
    }
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    const startDate = req.query.startDate ? String(req.query.startDate) : null;
    const endDate = req.query.endDate ? String(req.query.endDate) : null;
    try {
      let invoiceQuery = supabaseAdmin
        .from('invoices')
        .select('invoice_number, amount_paid, payment_method, payment_status, total_amount, created_at')
        .eq('tenant_id', tenantId);
      if (startDate) invoiceQuery = invoiceQuery.gte('created_at', startDate);
      if (endDate) invoiceQuery = invoiceQuery.lte('created_at', endDate);
      const { data, error } = await invoiceQuery;
      if (error) throw error;
      return res.status(200).json(collectionSummaryFromInvoices(data, { start: startDate, end: endDate }));
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to load collection summary' });
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
    const liveVa =
      payload.quasarLiveBalance != null && Number.isFinite(Number(payload.quasarLiveBalance))
        ? Number(payload.quasarLiveBalance)
        : Number(payload.pendingVirtualAccountFunds || 0);
    return res.status(200).json({
      ...payload,
      totalRevenue: Number(payload.totalRevenue ?? payload.totalCollected ?? 0),
      outstandingFees: sales.totalPending || 0,
      paidStudentsCount: payload.studentMetrics?.paid || 0,
      owingStudentsCount: payload.studentMetrics?.owing || 0,
      totalStudents: payload.studentMetrics?.total || 0,
      lastUpdated: new Date().toISOString(),
      cardCollected: card,
      vaTransferCollected: Number(sales.vaTransfer || 0),
      cashCollected: Number(sales.cash || 0),
      quasarCollected: card + Number(sales.vaTransfer || 0),
      quasarLiveBalance: Number.isFinite(liveVa) ? liveVa : payload.quasarLiveBalance,
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
      const [invoicesRes, creditsRes, payoutsRes] = await Promise.all([
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
        supabaseAdmin
          .from('transactions_log')
          .select('id, reference, amount, type, status, metadata, created_at')
          .eq('tenant_id', tenantId)
          .eq('type', 'payout')
          .in('status', ['SUCCESS', 'PENDING', 'PROCESSING', 'FAILED'])
          .order('created_at', { ascending: false })
          .limit(limit),
      ]);

      if (invoicesRes.error) console.error('Error fetching school transactions:', invoicesRes.error);
      if (creditsRes.error) console.error('Error fetching quasar credits:', creditsRes.error);
      if (payoutsRes.error) console.error('Error fetching withdrawals:', payoutsRes.error);

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

      const [chargeVersion, withdrawalFeeVersion] = await Promise.all([
        publishedVaInwardVersion(),
        publishedTreasuryWithdrawalVersion(),
      ]);
      for (const tx of creditsRes.data || []) {
        const amount = transactionAmountNaira(tx);
        if (!(amount > 0)) continue;
        const meta = tx.metadata || {};
        const name = meta.senderName || meta.studentName || 'Virtual Account credit';
        const parentOwned = String(meta.paidVia || meta.paid_via || '').toLowerCase().includes('parent');
        const reference = tx.reference || String(tx.id);
        items.push({
          id: tx.id,
          wallet_id: tx.wallet_id || 'quasar',
          amount,
          type: 'credit',
          reference,
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
        if (chargeVersion) {
          const charge = inwardChargeNaira(amount, chargeVersion);
          if (charge > 0) {
            items.push(inwardChargeLine({ id: String(tx.id), reference, created_at: tx.created_at }, charge));
          }
        }
      }

      for (const tx of payoutsRes.data || []) {
        const amount = transactionAmountNaira(tx);
        if (!(amount > 0)) continue;
        const meta = tx.metadata || {};
        const state = String(tx.status || '').toUpperCase();
        const bank = String(meta.bank_name || '').trim();
        const title = state === 'FAILED'
          ? 'Withdrawal failed'
          : state === 'SUCCESS'
            ? 'Withdrawal'
            : 'Withdrawal pending';
        const reference = tx.reference || String(tx.id);
        items.push({
          id: tx.id,
          wallet_id: 'quasar',
          amount: -amount,
          type: 'debit',
          reference,
          description: bank ? `${title} · ${bank}` : title,
          balance_after: 0,
          channel: 'Withdrawal',
          created_at: tx.created_at,
          metadata: {
            student_name: bank ? `${title} · ${bank}` : title,
            payout: true,
            status: state,
            bank_name: bank || null,
            service_fee: meta.service_fee ?? null,
            total_required: meta.total_required ?? null,
          },
        });
        const charge = withdrawalChargeNaira(amount, meta, withdrawalFeeVersion);
        if (charge > 0 && state !== 'FAILED') {
          items.push(withdrawalChargeLine(
            { id: String(tx.id), reference, created_at: tx.created_at },
            charge,
          ));
        }
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
        .select('amount, type, account')
        .eq('type', 'CREDIT');

      let debitsQuery = supabaseAdmin
        .from('ledger_entries')
        .select('amount, type, account')
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

      const walletSide = (rows: any[] | null) => (rows || []).filter((row) => {
        const account = String(row.account || '');
        return !account || account === 'USER_WALLET';
      });
      const totalCredits = walletSide(creditsRes.data).reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0) || 0;
      const totalDebits = walletSide(debitsRes.data).reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0) || 0;

      let quasarCredits = 0;
      let quasarPayouts = 0;
      if (tenantId && !(totalCredits > 0)) {
        const [creditLog, payoutLog] = await Promise.all([
          supabaseAdmin
            .from('transactions_log')
            .select('amount, metadata')
            .eq('tenant_id', tenantId)
            .eq('status', 'SUCCESS')
            .in('type', ['CREDIT', 'DEPOSIT', 'INWARD', 'INWARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT']),
          supabaseAdmin
            .from('transactions_log')
            .select('amount')
            .eq('tenant_id', tenantId)
            .eq('status', 'SUCCESS')
            .eq('type', 'payout'),
        ]);
        quasarCredits = (creditLog.data || []).reduce((sum, tx) => sum + transactionAmountNaira(tx), 0);
        quasarPayouts = (payoutLog.data || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      }

      // VA credits often sit in transactions_log before a wallet ledger row exists.
      const pendingSettlement = Math.max(
        0,
        roundNaira(
          quasarCredits > 0
            ? quasarCredits - quasarPayouts
            : walletInfo && Number.isFinite(Number(walletInfo.balance)) && Number(walletInfo.balance) > 0
              ? Number(walletInfo.balance)
              : totalCredits - totalDebits,
        ),
      );
      const clearedToday = quasarPayouts > 0 ? quasarPayouts : totalDebits;
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

      const seen = new Set(payments.map((p) => String(p.reference)));
      const { data: pendingAlerts } = await supabaseAdmin
        .from('payment_alert_deliveries')
        .select('id, tenant_id, reference, amount, payload, created_at, status')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .limit(50);
      for (const row of pendingAlerts || []) {
        const reference = String(row.reference || '').trim();
        if (!reference || seen.has(reference)) continue;
        seen.add(reference);
        const payload = row.payload || {};
        payments.push({
          id: row.id,
          reference,
          amount: Number(row.amount || 0),
          type: 'payment.success',
          status: 'SUCCESS',
          createdAt: row.created_at,
          walletId: payload.walletId || null,
          customerId: payload.customerId || null,
          metadata: payload.metadata || {},
        });
      }

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
      const notAStudent = new Set(['fee', 'school', 'quasar', 'local']);
      if (notAStudent.has(studentId)) {
        return res.status(200).json({
          totalFees: 0,
          totalPaid: 0,
          outstandingBalance: 0,
          currentBalance: 0,
          studentId,
        });
      }

      const isCloudCustomer = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(studentId);
      if (!isCloudCustomer) {
        return res.status(500).json({ error: 'Failed to load student summary' });
      }

      const { data: invoices, error } = await supabaseAdmin
        .from('invoices')
        .select('amount_paid, total_amount, payment_status, customer_id')
        .eq('tenant_id', tenantId)
        .eq('customer_id', studentId);
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

  /**
   * POST /api/v1/finance/quasar-resync
   * Pull each Quasar account ledger and record credits Invify is missing.
   * Window: the newest 50 entries, plus any older entry from the last 20 days.
   */
  static async resyncQuasar(req: Request, res: Response) {
    const tenantId = resolveTenantScope(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    try {
      const accounts = (await QfsQuasarBridgeService.listAccounts(tenantId)) || [];
      const cutoff = Date.now() - QUASAR_RESYNC_DAYS * 24 * 60 * 60 * 1000;
      const credits: Array<{ reference: string; amount: number; va: string; createdAt: string }> = [];

      for (const account of accounts) {
        const accountId = String(account?.id || account?.account_id || '').trim();
        if (!accountId) continue;
        const va = String(account?.accountNumber || account?.account_number || '').trim();
        const collected: any[] = [];
        let offset = 0;
        for (let page = 0; page < 8; page += 1) {
          const raw = await QfsQuasarBridgeService.getLedger(tenantId, accountId, 50, offset, { noRetry: true, timeoutMs: 8000 });
          const rows = Array.isArray(raw) ? raw : [];
          if (rows.length === 0) break;
          collected.push(...rows);
          offset += rows.length;
          if (rows.length < 50) break;
          const oldest = quasarEntryTimestamp(rows[rows.length - 1]);
          if (page > 0 && (!Number.isFinite(oldest) || oldest < cutoff)) break;
        }

        for (const entry of selectQuasarResyncEntries(collected)) {
          if (!isQuasarCreditEntry(entry)) continue;
          const amount = quasarLedgerAmountNaira(entry);
          const reference = quasarLedgerReference(entry, accountId);
          if (!(amount > 0) || !reference) continue;
          const ts = quasarEntryTimestamp(entry);
          credits.push({
            reference,
            amount,
            va,
            createdAt: Number.isFinite(ts) ? new Date(ts).toISOString() : new Date().toISOString(),
          });
        }
      }

      const unique = new Map<string, (typeof credits)[number]>();
      for (const credit of credits) {
        if (!unique.has(credit.reference)) unique.set(credit.reference, credit);
      }
      const wanted = [...unique.values()];
      const references = wanted.map((c) => c.reference);

      const existingRefs = new Set<string>();
      const existingCredits: Array<{ reference: string; amount: number; createdAt: string }> = [];
      const { data: logged, error: loggedErr } = await supabaseAdmin
        .from('transactions_log')
        .select('reference, amount, created_at, metadata')
        .eq('tenant_id', tenantId)
        .eq('status', 'SUCCESS')
        .order('created_at', { ascending: false })
        .limit(200);
      if (loggedErr) throw loggedErr;
      for (const row of logged || []) {
        if (row?.reference) existingRefs.add(String(row.reference));
        existingCredits.push({
          reference: String(row.reference || ''),
          amount: transactionAmountNaira(row),
          createdAt: String(row.created_at || ''),
        });
      }
      for (let i = 0; i < references.length; i += 100) {
        const slice = references.slice(i, i + 100);
        if (slice.length === 0) continue;
        const { data, error } = await supabaseAdmin
          .from('transactions_log')
          .select('reference')
          .eq('tenant_id', tenantId)
          .in('reference', slice);
        if (error) throw error;
        for (const row of data || []) {
          if (row?.reference) existingRefs.add(String(row.reference));
        }
      }

      let imported = 0;
      const errors: string[] = [];
      let io: any = null;
      try {
        io = require('../app').io;
      } catch {
        io = null;
      }
      for (const credit of wanted) {
        const already =
          existingRefs.has(credit.reference) ||
          existingCredits.some((row) => isSameQuasarCredit(row, credit));
        if (already) continue;
        const { error } = await supabaseAdmin.from('transactions_log').insert({
          reference: credit.reference,
          tenant_id: tenantId,
          amount: credit.amount,
          type: 'CREDIT',
          provider: 'quasar',
          status: 'SUCCESS',
          created_at: credit.createdAt,
          metadata: {
            virtualAccountNumber: credit.va || null,
            accountNumber: credit.va || null,
            amountNaira: credit.amount,
            source: 'quasar_resync',
            window: 'last_50_or_20_days',
          },
        });
        if (error) {
          errors.push(error.message || credit.reference);
          continue;
        }
        existingRefs.add(credit.reference);
        existingCredits.push(credit);
        imported += 1;
        try {
          await postSyncedCreditToWallet(tenantId, credit.reference, credit.amount, credit.va);
        } catch (walletErr: any) {
          console.warn(`[QuasarResync] wallet skip ${credit.reference}:`, walletErr?.message || walletErr);
        }
        try {
          await PaymentAlertTrailService.recordAndEmit(io, {
            tenantId,
            reference: credit.reference,
            amount: credit.amount,
            payload: {
              metadata: {
                virtualAccountNumber: credit.va || null,
                accountNumber: credit.va || null,
                senderName: 'Quasar',
                studentName: 'Quasar',
                sandbox: true,
                source: 'quasar_resync',
              },
            },
          });
        } catch (alertErr: any) {
          console.warn(`[QuasarResync] alert skip ${credit.reference}:`, alertErr?.message || alertErr);
        }
      }

      return res.status(200).json({
        success: true,
        accounts: accounts.length,
        scanned: wanted.length,
        alreadyRecorded: wanted.length - imported - errors.length,
        imported,
        errors: errors.slice(0, 5),
        window: { latest: 50, days: QUASAR_RESYNC_DAYS },
      });
    } catch (error: any) {
      console.error('[ExecutiveFinanceController] resyncQuasar Error:', error.message);
      return res.status(500).json({ error: 'Could not resync Quasar transactions' });
    }
  }
}
