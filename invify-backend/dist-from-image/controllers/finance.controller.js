"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutiveFinanceController = void 0;
const supabase_1 = require("../db/supabase");
const invoice_payment_method_1 = require("../utils/invoice-payment-method");
const invoice_collection_1 = require("../utils/invoice-collection");
const invoice_collection_summary_1 = require("../utils/invoice-collection-summary");
const resolve_tenant_scope_1 = require("../utils/resolve-tenant-scope");
const finance_tenant_1 = require("../utils/finance-tenant");
const virtual_account_funds_1 = require("../utils/virtual-account-funds");
const wallet_service_1 = require("../services/wallet.service");
const qfs_quasar_bridge_service_1 = require("../services/qfs-quasar-bridge.service");
const FeeCalculator_1 = require("../modules/fee-orchestration/FeeCalculator");
const quasar_resync_1 = require("../utils/quasar-resync");
const payment_alert_trail_service_1 = require("../services/payment-alert-trail.service");
const payment_alert_quasar_sync_1 = require("../services/payment-alert-quasar-sync");
/** Configured fee in naira, kept to kobo. 102 kobo is ₦1.02. */
function feeNairaFromKobo(finalFeeKobo) {
    const kobo = Number(finalFeeKobo);
    if (!Number.isFinite(kobo) || kobo <= 0)
        return 0;
    return Number((Math.round(kobo) / 100).toFixed(2));
}
/** Published fee version. Does not change the profile. */
async function publishedFeeVersion(transactionType) {
    try {
        const { data: profiles, error } = await supabase_1.supabaseAdmin
            .from('fee_profiles')
            .select('id')
            .eq('transaction_type', transactionType)
            .limit(5);
        if (error || !profiles?.length)
            return null;
        const { data: versions } = await supabase_1.supabaseAdmin
            .from('fee_profile_versions')
            .select('method, percentage_bps, flat_amount_kobo, min_fee_kobo, max_fee_kobo, status')
            .in('profile_id', profiles.map((row) => row.id))
            .eq('status', 'PUBLISHED')
            .limit(1);
        const version = versions?.[0];
        if (!version)
            return null;
        const method = String(version.method || '');
        if (method !== 'FLAT' && method !== 'PERCENTAGE' && method !== 'HYBRID')
            return null;
        return {
            method,
            percentage_bps: Number(version.percentage_bps || 0),
            flat_amount_kobo: Number(version.flat_amount_kobo || 0),
            min_fee_kobo: Number(version.min_fee_kobo || 0),
            max_fee_kobo: Number(version.max_fee_kobo || 0),
        };
    }
    catch (err) {
        console.warn(`[ExecutiveFinance] ${transactionType} charge profile skipped:`, err?.message || err);
        return null;
    }
}
async function publishedVaInwardVersion() {
    return publishedFeeVersion('VIRTUAL_ACCOUNT_INWARD_TRANSFER');
}
async function publishedTreasuryWithdrawalVersion() {
    return publishedFeeVersion('TREASURY_WITHDRAWAL');
}
function inwardChargeNaira(amountNaira, version) {
    const kobo = Math.round(Number(amountNaira) * 100);
    if (!Number.isSafeInteger(kobo) || kobo <= 0)
        return 0;
    try {
        const calc = FeeCalculator_1.FeeCalculator.calculate({
            method: version.method,
            transactionAmountKobo: kobo,
            percentageBps: version.percentage_bps,
            flatAmountKobo: version.flat_amount_kobo,
            minFeeKobo: version.min_fee_kobo,
            maxFeeKobo: version.max_fee_kobo,
        });
        return feeNairaFromKobo(calc.final_fee_kobo);
    }
    catch {
        return 0;
    }
}
/** Billed collections only. Live leftover VA is not school revenue. */
function reportedSchoolRevenue(input) {
    const base = Math.max(input.invoiceCollected, input.cash + input.wallet + input.card + input.vaTransfer);
    return (0, virtual_account_funds_1.roundNaira)(base);
}
function inwardChargeLine(credit, chargeNaira) {
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
function withdrawalChargeNaira(amountNaira, meta, version) {
    const stored = Number(meta.service_fee);
    if (Number.isFinite(stored) && stored > 0)
        return (0, virtual_account_funds_1.roundNaira)(stored);
    const total = Number(meta.total_required);
    if (Number.isFinite(total) && total > amountNaira)
        return (0, virtual_account_funds_1.roundNaira)(total - amountNaira);
    if (!version)
        return 0;
    return inwardChargeNaira(amountNaira, version);
}
function withdrawalChargeLine(payout, chargeNaira) {
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
class ExecutiveFinanceController {
    /**
     * GET /api/finance/executive-summary
     * Returns a high-level financial overview for school executives.
     */
    static async getSummary(req, res) {
        const tenantId = (0, resolve_tenant_scope_1.resolveTenantScope)(req);
        const { startDate, endDate } = req.query;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID required' });
        }
        try {
            // 2. Query and aggregate from the invoices table
            let invoiceQuery = supabase_1.supabaseAdmin
                .from('invoices')
                .select('*')
                .eq('tenant_id', tenantId);
            if (startDate)
                invoiceQuery = invoiceQuery.gte('created_at', startDate);
            if (endDate)
                invoiceQuery = invoiceQuery.lte('created_at', endDate);
            const [walletRes, invoicesRes, allInvoicesRes, payoutsRes, quasarCreditsRes, quasarSweepsRes, studentsRes, customersRes, unmatchedRes, failedPayoutsRes, customerVaRes, staffVaRes, studentVaRes,] = await Promise.all([
                supabase_1.supabaseAdmin.from('wallets').select('id, balance').eq('tenant_id', tenantId).limit(1).maybeSingle(),
                invoiceQuery,
                supabase_1.supabaseAdmin.from('invoices').select('customer_id, invoice_number, amount_paid, payment_method, payment_status, total_amount, created_at').eq('tenant_id', tenantId),
                supabase_1.supabaseAdmin.from('transactions_log').select('amount').eq('tenant_id', tenantId).eq('type', 'payout').eq('status', 'SUCCESS'),
                supabase_1.supabaseAdmin
                    .from('transactions_log')
                    .select('id, amount, type, reference, created_at, metadata')
                    .eq('tenant_id', tenantId)
                    .eq('status', 'SUCCESS')
                    .in('type', ['CREDIT', 'DEPOSIT', 'INWARD', 'INWARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT']),
                supabase_1.supabaseAdmin
                    .from('transactions_log')
                    .select('id, amount, type, reference, created_at, metadata')
                    .eq('tenant_id', tenantId)
                    .eq('status', 'SUCCESS')
                    .in('type', ['SWEEP', 'DEBIT', 'WITHDRAWAL']),
                supabase_1.supabaseAdmin.from('students').select('id, admission_number, running_balance').eq('school_id', tenantId),
                supabase_1.supabaseAdmin.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
                supabase_1.supabaseAdmin.from('transactions_log').select('id').eq('tenant_id', tenantId).eq('status', 'PENDING').is('metadata->studentId', null),
                supabase_1.supabaseAdmin.from('transactions_log').select('id').eq('tenant_id', tenantId).eq('status', 'FAILED').eq('type', 'payout'),
                supabase_1.supabaseAdmin
                    .from('customers')
                    .select('virtual_account_number')
                    .eq('tenant_id', tenantId)
                    .not('virtual_account_number', 'is', null),
                supabase_1.supabaseAdmin
                    .from('users')
                    .select('virtual_account_number')
                    .eq('tenant_id', tenantId)
                    .not('virtual_account_number', 'is', null),
                supabase_1.supabaseAdmin
                    .from('students')
                    .select('virtual_account_number')
                    .eq('school_id', tenantId)
                    .not('virtual_account_number', 'is', null),
            ]);
            const wallet = walletRes.data;
            if (!wallet) {
                await wallet_service_1.WalletService.ensureWallet(tenantId);
            }
            let derivedWalletBalance = Number(wallet?.balance || 0);
            try {
                const derived = await wallet_service_1.WalletService.getBalance(tenantId);
                if (Number.isFinite(Number(derived?.balance))) {
                    derivedWalletBalance = Number(derived.balance);
                }
            }
            catch {
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
            const collection = (0, invoice_collection_summary_1.collectionSummaryFromInvoices)(invoices, {
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
            const allTimeCollected = allInvoices?.reduce((sum, inv) => sum + (0, invoice_collection_1.collectedInvoiceAmount)(inv), 0) || 0;
            // Only card/POS + Quasar VA invoices. Tenant personal-bank transfers stay out.
            let totalQuasarFromCardInvoices = 0;
            for (const inv of (allInvoices || [])) {
                const collected = (0, invoice_collection_1.collectedInvoiceAmount)(inv);
                const rail = (0, invoice_payment_method_1.classifyInvoicePaymentMethod)(inv.payment_method);
                if (rail === 'card')
                    totalQuasarFromCardInvoices += collected;
            }
            // Live Quasar VA / webhook deposits (dedupe by reference AND same VA+amount in a 2-minute window)
            const seenCreditRefs = new Set();
            let totalQuasarFromDeposits = 0;
            for (const tx of (quasarCredits || [])) {
                const amount = (0, virtual_account_funds_1.transactionAmountNaira)(tx);
                if (!(amount > 0))
                    continue;
                const va = String(tx?.metadata?.virtualAccountNumber ||
                    tx?.metadata?.accountNumber ||
                    tx?.metadata?.virtual_account_number ||
                    '').trim();
                const ref = String(tx.reference || tx.id || '').trim();
                const ts = Date.parse(String(tx.created_at || ''));
                const bucket = Number.isFinite(ts) ? Math.floor(ts / 120000) : String(tx.created_at || '');
                const keys = [
                    ref ? `ref:${ref}` : '',
                    `fuzzy:${va || 'NOVA'}:${amount}:${bucket}`,
                ].filter(Boolean);
                if (keys.some((k) => seenCreditRefs.has(k)))
                    continue;
                keys.forEach((k) => seenCreditRefs.add(k));
                totalQuasarFromDeposits += amount;
            }
            const totalQuasarRemitted = payouts?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
            let parentEntities = [];
            try {
                const parentVaRes = await supabase_1.supabaseAdmin
                    .from('school_entities')
                    .select('payload')
                    .eq('tenant_id', tenantId)
                    .in('entity_type', ['parent_virtual_account', 'parent']);
                parentEntities = parentVaRes.data || [];
            }
            catch {
                parentEntities = [];
            }
            const parentVas = parentEntities
                .map((row) => {
                const p = row?.payload && typeof row.payload === 'object' ? row.payload : {};
                return String(p.accountNumber || p.virtualAccountNumber || p.virtual_account_number || '').trim();
            })
                .filter(Boolean);
            const unsweptVa = (0, virtual_account_funds_1.splitUnsweptVirtualAccountFunds)({
                transactions: [...(quasarCredits || []), ...(quasarSweeps || [])],
                customerVas: (customerVaRes.data || []).map((row) => row.virtual_account_number),
                staffVas: (staffVaRes.data || []).map((row) => row.virtual_account_number),
                studentVas: (studentVaRes.data || []).map((row) => row.virtual_account_number),
                parentVas,
            });
            let pendingVirtualAccountFunds = unsweptVa.total;
            let quasarLiveBalance = null;
            try {
                const sandboxAccounts = await Promise.race([
                    qfs_quasar_bridge_service_1.QfsQuasarBridgeService.listAccounts(tenantId),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Quasar live VA timed out')), 4000)),
                ]);
                if (Array.isArray(sandboxAccounts) && sandboxAccounts.length > 0) {
                    quasarLiveBalance = (0, virtual_account_funds_1.sumQuasarSandboxBalancesNaira)(sandboxAccounts);
                }
            }
            catch (err) {
                console.warn('[ExecutiveFinance] Quasar live VA total unavailable:', err?.message || err);
            }
            const invifyLoggedVa = (0, virtual_account_funds_1.roundNaira)(pendingVirtualAccountFunds);
            // Quasar is source of truth for what is actually sitting at the PSP.
            // Invify > Quasar means double-posting (tablet sync + webhook) and needs investigation.
            // Quasar > Invify is fine — credits not yet in Invify.
            let quasarBalanceStatus = 'ok';
            if (quasarLiveBalance != null && Number.isFinite(quasarLiveBalance)) {
                if (invifyLoggedVa > quasarLiveBalance + 0.009) {
                    quasarBalanceStatus = 'invify_overstated';
                    pendingVirtualAccountFunds = quasarLiveBalance;
                    console.warn(`[ExecutiveFinance] Invify VA log ₦${invifyLoggedVa} > live Quasar ₦${quasarLiveBalance} for tenant ${tenantId} — investigate double sync`);
                }
                else if (quasarLiveBalance > invifyLoggedVa + 0.009) {
                    quasarBalanceStatus = 'quasar_ahead';
                    pendingVirtualAccountFunds = quasarLiveBalance;
                }
                else {
                    pendingVirtualAccountFunds = quasarLiveBalance;
                }
            }
            pendingVirtualAccountFunds = (0, virtual_account_funds_1.roundNaira)(pendingVirtualAccountFunds);
            // Held is money still sitting at Quasar now (unswept VA + unremitted card).
            // Do not floor that with all-time deposit totals — those stay in "In".
            const pendingQuasarRemittance = Math.max(0, (0, virtual_account_funds_1.roundNaira)(pendingVirtualAccountFunds + totalQuasarFromCardInvoices - totalQuasarRemitted));
            const totalQuasarCollected = (0, virtual_account_funds_1.roundNaira)(totalQuasarFromDeposits + totalQuasarFromCardInvoices);
            let totalCount = 0;
            let owingCount = 0;
            let paidCount = 0;
            if (students && students.length > 0) {
                // Dedupe twin sync rows (same admission / name+class) before counting.
                const seen = new Set();
                const unique = students.filter((s) => {
                    const adm = String(s.admission_number || '').trim().toLowerCase();
                    const key = adm
                        ? `adm:${adm}`
                        : `id:${s.id}`;
                    if (seen.has(key))
                        return false;
                    seen.add(key);
                    return true;
                });
                totalCount = unique.length;
                // App convention: balance > 0 = owing, balance < 0 = credit
                owingCount = unique.filter((s) => Number(s.running_balance || 0) > 0).length;
                paidCount = Math.max(0, totalCount - owingCount);
            }
            else {
                const customerInvoiceMap = new Map();
                allInvoices?.forEach((inv) => {
                    if (inv.customer_id) {
                        if (!customerInvoiceMap.has(inv.customer_id)) {
                            customerInvoiceMap.set(inv.customer_id, []);
                        }
                        customerInvoiceMap.get(inv.customer_id).push(inv.payment_status || 'Unpaid');
                    }
                });
                totalCount = custCount || 0;
                customerInvoiceMap.forEach((statuses) => {
                    const hasUnpaid = statuses.some(s => s.toLowerCase() !== 'paid');
                    if (hasUnpaid)
                        owingCount++;
                });
                paidCount = Math.max(0, totalCount - owingCount);
            }
            let quasarWithdrawable = 0;
            try {
                const { QuasarWithdrawableService } = await Promise.resolve().then(() => __importStar(require('../services/quasar-withdrawable.service')));
                quasarWithdrawable = await QuasarWithdrawableService.available(tenantId);
            }
            catch (withdrawableErr) {
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
            const quasarOnHand = (0, virtual_account_funds_1.roundNaira)(card + pendingVirtualAccountFunds);
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
                quasarLiveBalance: quasarLiveBalance == null ? null : (0, virtual_account_funds_1.roundNaira)(quasarLiveBalance),
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
                    totalInvoiced: (0, virtual_account_funds_1.roundNaira)(totalInvoiced),
                    totalCollected: (0, virtual_account_funds_1.roundNaira)(totalCollected),
                    recordedCollected: (0, virtual_account_funds_1.roundNaira)(totalCollected),
                    totalPending: (0, virtual_account_funds_1.roundNaira)(totalPending),
                    card: (0, virtual_account_funds_1.roundNaira)(card),
                    vaTransfer: (0, virtual_account_funds_1.roundNaira)(vaTransfer),
                    bankTransfer: (0, virtual_account_funds_1.roundNaira)(bankTransfer),
                    transfer: (0, virtual_account_funds_1.roundNaira)(bankTransfer),
                    cash: (0, virtual_account_funds_1.roundNaira)(cash),
                    wallet: (0, virtual_account_funds_1.roundNaira)(walletAmount),
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
        }
        catch (error) {
            console.error('[ExecutiveFinanceController] Error:', error.message);
            return res.status(500).json({ error: 'Failed to generate executive summary' });
        }
    }
    /**
     * GET /api/v1/finance/invoices/collection-summary
     * Authoritative period totals for Tenant Admin and tablet Invoice History.
     */
    static async getCollectionSummary(req, res) {
        let tenantId;
        try {
            tenantId = (0, finance_tenant_1.resolveAuthoritativeTenantId)(req);
        }
        catch (err) {
            return res.status(err?.status || 403).json({ error: err?.message || 'Forbidden: Cross-tenant access denied' });
        }
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID required' });
        }
        const startDate = req.query.startDate ? String(req.query.startDate) : null;
        const endDate = req.query.endDate ? String(req.query.endDate) : null;
        try {
            let invoiceQuery = supabase_1.supabaseAdmin
                .from('invoices')
                .select('invoice_number, amount_paid, payment_method, payment_status, total_amount, created_at')
                .eq('tenant_id', tenantId);
            if (startDate)
                invoiceQuery = invoiceQuery.gte('created_at', startDate);
            if (endDate)
                invoiceQuery = invoiceQuery.lte('created_at', endDate);
            const { data, error } = await invoiceQuery;
            if (error)
                throw error;
            return res.status(200).json((0, invoice_collection_summary_1.collectionSummaryFromInvoices)(data, { start: startDate, end: endDate }));
        }
        catch (err) {
            return res.status(500).json({ error: err.message || 'Failed to load collection summary' });
        }
    }
    /**
     * GET /api/finance/school-dashboard
     * School Finance Dashboard: total revenue plus Quasar card + VA transfer.
     */
    static async getSchoolDashboard(req, res) {
        let payload;
        const capture = {
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(body) {
                payload = body;
                return this;
            },
            statusCode: 200,
        };
        await ExecutiveFinanceController.getSummary(req, capture);
        if (!payload || payload.error) {
            return res.status(capture.statusCode || 500).json(payload || { error: 'Failed to load dashboard' });
        }
        const sales = payload.salesSummary || {};
        const card = Number(sales.card || 0);
        const liveVa = payload.quasarLiveBalance != null && Number.isFinite(Number(payload.quasarLiveBalance))
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
    static async getDailyRevenue(req, res) {
        const tenantId = (0, resolve_tenant_scope_1.resolveTenantScope)(req);
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID required' });
        }
        const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
        try {
            const since = new Date();
            since.setDate(since.getDate() - days);
            since.setHours(0, 0, 0, 0);
            const lagosDay = (iso) => {
                if (!iso)
                    return '';
                const d = new Date(iso);
                if (Number.isNaN(d.getTime()))
                    return String(iso).slice(0, 10);
                return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
            };
            const [invoicesRes, creditsRes] = await Promise.all([
                supabase_1.supabaseAdmin
                    .from('invoices')
                    .select('id, invoice_number, amount_paid, payment_status, created_at, updated_at')
                    .eq('tenant_id', tenantId)
                    .gte('created_at', since.toISOString()),
                supabase_1.supabaseAdmin
                    .from('transactions_log')
                    .select('amount, type, status, metadata, created_at, reference')
                    .eq('tenant_id', tenantId)
                    .eq('status', 'SUCCESS')
                    .in('type', ['CREDIT', 'DEPOSIT', 'INWARD', 'INWARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT'])
                    .gte('created_at', since.toISOString()),
            ]);
            const byDay = new Map();
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = d.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
                byDay.set(key, 0);
            }
            const add = (iso, amount) => {
                if (!(amount > 0) || !iso)
                    return;
                const key = lagosDay(iso);
                if (!byDay.has(key))
                    return;
                byDay.set(key, (byDay.get(key) || 0) + amount);
            };
            const invoiceIds = new Set();
            const invoiceNumbers = new Set();
            for (const inv of invoicesRes.data || []) {
                if (inv.id)
                    invoiceIds.add(String(inv.id));
                if (inv.invoice_number)
                    invoiceNumbers.add(String(inv.invoice_number));
                add(inv.updated_at || inv.created_at, (0, invoice_collection_1.collectedInvoiceAmount)(inv));
            }
            for (const tx of creditsRes.data || []) {
                const meta = tx.metadata || {};
                const linkedId = String(meta.invoice_id || meta.invoiceId || '');
                const linkedNo = String(meta.invoice_number || meta.invoiceNumber || '');
                if (linkedId && invoiceIds.has(linkedId))
                    continue;
                if (linkedNo && invoiceNumbers.has(linkedNo))
                    continue;
                add(tx.created_at, (0, virtual_account_funds_1.transactionAmountNaira)(tx));
            }
            return res.status(200).json(Array.from(byDay.entries()).map(([date, revenue]) => ({
                date,
                revenue: (0, virtual_account_funds_1.roundNaira)(revenue),
            })));
        }
        catch (error) {
            console.error('[ExecutiveFinanceController] getDailyRevenue Error:', error.message);
            return res.status(500).json({ error: 'Failed to load daily revenue' });
        }
    }
    /**
     * GET /api/finance/transactions
     * Live school feed: paid invoices (incl. card/POS) + Quasar VA credits.
     */
    static async getSchoolTransactions(req, res) {
        const tenantId = (0, resolve_tenant_scope_1.resolveTenantScope)(req);
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID required' });
        }
        const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
        try {
            const [invoicesRes, creditsRes, payoutsRes] = await Promise.all([
                supabase_1.supabaseAdmin
                    .from('invoices')
                    .select('id, invoice_number, customer_name, amount_paid, payment_method, payment_status, created_at, student_id, customer_id')
                    .eq('tenant_id', tenantId)
                    .gt('amount_paid', 0)
                    .order('created_at', { ascending: false })
                    .limit(limit),
                supabase_1.supabaseAdmin
                    .from('transactions_log')
                    .select('id, reference, amount, type, metadata, created_at, wallet_id')
                    .eq('tenant_id', tenantId)
                    .eq('status', 'SUCCESS')
                    .in('type', ['CREDIT', 'DEPOSIT', 'INWARD', 'INWARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT'])
                    .order('created_at', { ascending: false })
                    .limit(limit),
                supabase_1.supabaseAdmin
                    .from('transactions_log')
                    .select('id, reference, amount, type, status, metadata, created_at')
                    .eq('tenant_id', tenantId)
                    .eq('type', 'payout')
                    .in('status', ['SUCCESS', 'PENDING', 'PROCESSING', 'FAILED'])
                    .order('created_at', { ascending: false })
                    .limit(limit),
            ]);
            if (invoicesRes.error)
                console.error('Error fetching school transactions:', invoicesRes.error);
            if (creditsRes.error)
                console.error('Error fetching quasar credits:', creditsRes.error);
            if (payoutsRes.error)
                console.error('Error fetching withdrawals:', payoutsRes.error);
            const channelForRail = (rail) => {
                if (rail === 'card')
                    return 'Card';
                if (rail === 'va_transfer')
                    return 'Transfer';
                if (rail === 'bank_transfer')
                    return 'Bank';
                if (rail === 'cash')
                    return 'Cash';
                if (rail === 'wallet')
                    return 'Wallet';
                return 'Other';
            };
            const items = [];
            for (const inv of invoicesRes.data || []) {
                const collected = (0, invoice_collection_1.collectedInvoiceAmount)(inv);
                if (!(collected > 0))
                    continue;
                const rail = (0, invoice_payment_method_1.classifyInvoicePaymentMethod)(inv.payment_method);
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
                const amount = (0, virtual_account_funds_1.transactionAmountNaira)(tx);
                if (!(amount > 0))
                    continue;
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
                        virtualAccountNumber: meta.virtualAccountNumber || meta.accountNumber || meta.virtual_account_number || null,
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
                const amount = (0, virtual_account_funds_1.transactionAmountNaira)(tx);
                if (!(amount > 0))
                    continue;
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
                    items.push(withdrawalChargeLine({ id: String(tx.id), reference, created_at: tx.created_at }, charge));
                }
            }
            items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            return res.status(200).json(items.slice(0, limit));
        }
        catch (error) {
            console.error('[ExecutiveFinanceController] getSchoolTransactions Error:', error.message);
            return res.status(500).json({ error: 'Failed to load transactions' });
        }
    }
    /**
     * GET /api/finance/payouts/stats
     * Returns global system aggregates for payouts/settlements
     */
    static async getPayoutStats(req, res) {
        try {
            const tenantId = (0, resolve_tenant_scope_1.resolveTenantScope)(req);
            let creditsQuery = supabase_1.supabaseAdmin
                .from('ledger_entries')
                .select('amount, type, account')
                .eq('type', 'CREDIT');
            let debitsQuery = supabase_1.supabaseAdmin
                .from('ledger_entries')
                .select('amount, type, account')
                .eq('type', 'DEBIT');
            let disputesQuery = supabase_1.supabaseAdmin
                .from('reconciliation_cases')
                .select('difference_amount')
                .in('status', ['PENDING', 'INVESTIGATING', 'ESCALATED']);
            let failedQuery = supabase_1.supabaseAdmin
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
                tenantId ? wallet_service_1.WalletService.getBalance(tenantId) : Promise.resolve(null),
            ]);
            if (creditsRes.error)
                console.error('Error fetching credits:', creditsRes.error);
            if (debitsRes.error)
                console.error('Error fetching debits:', debitsRes.error);
            if (disputesRes.error)
                console.error('Error fetching disputes:', disputesRes.error);
            if (failedRes.error)
                console.error('Error fetching failed cases:', failedRes.error);
            const walletSide = (rows) => (rows || []).filter((row) => {
                const account = String(row.account || '');
                return !account || account === 'USER_WALLET';
            });
            const totalCredits = walletSide(creditsRes.data).reduce((acc, curr) => acc + Number(curr.amount || 0), 0) || 0;
            const totalDebits = walletSide(debitsRes.data).reduce((acc, curr) => acc + Number(curr.amount || 0), 0) || 0;
            let quasarCredits = 0;
            let quasarPayouts = 0;
            if (tenantId && !(totalCredits > 0)) {
                const [creditLog, payoutLog] = await Promise.all([
                    supabase_1.supabaseAdmin
                        .from('transactions_log')
                        .select('amount, metadata')
                        .eq('tenant_id', tenantId)
                        .eq('status', 'SUCCESS')
                        .in('type', ['CREDIT', 'DEPOSIT', 'INWARD', 'INWARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT']),
                    supabase_1.supabaseAdmin
                        .from('transactions_log')
                        .select('amount')
                        .eq('tenant_id', tenantId)
                        .eq('status', 'SUCCESS')
                        .eq('type', 'payout'),
                ]);
                quasarCredits = (creditLog.data || []).reduce((sum, tx) => sum + (0, virtual_account_funds_1.transactionAmountNaira)(tx), 0);
                quasarPayouts = (payoutLog.data || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
            }
            // VA credits often sit in transactions_log before a wallet ledger row exists.
            const pendingSettlement = Math.max(0, (0, virtual_account_funds_1.roundNaira)(quasarCredits > 0
                ? quasarCredits - quasarPayouts
                : walletInfo && Number.isFinite(Number(walletInfo.balance)) && Number(walletInfo.balance) > 0
                    ? Number(walletInfo.balance)
                    : totalCredits - totalDebits));
            const clearedToday = quasarPayouts > 0 ? quasarPayouts : totalDebits;
            const heldFunds = disputesRes.data?.reduce((acc, curr) => acc + Number(curr.difference_amount || 0), 0) || 0;
            const failedTransfers = failedRes.data?.length || 0;
            return res.status(200).json({
                pendingSettlement,
                clearedToday,
                heldFunds,
                failedTransfers
            });
        }
        catch (error) {
            console.error('[ExecutiveFinanceController] getPayoutStats Error:', error.message);
            return res.status(500).json({ error: 'Failed to fetch payout stats' });
        }
    }
    /**
     * GET /api/v1/finance/settlement-phases
     * Returns a chronological timeline of settlement events derived from actual ledger/settlement records.
     */
    static async getSettlementPhases(req, res) {
        const tenantId = (0, resolve_tenant_scope_1.resolveTenantScope)(req);
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant ID required' });
        try {
            // p10 ledger_entries columns: id, ledger_id, tenant_id, account, type, amount, currency, created_at
            const { data, error } = await supabase_1.supabaseAdmin
                .from('ledger_entries')
                .select('id, account, type, amount, created_at')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false })
                .limit(100);
            if (error) {
                console.warn('[ExecutiveFinanceController] getSettlementPhases ledger skip:', error.message);
                return res.status(200).json([]);
            }
            const phasesMap = new Map();
            data?.forEach((entry) => {
                const account = String(entry.account || 'SYSTEM');
                const phaseCode = account === 'QUASAR_CLEARING' ? 'QUASAR_POS'
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
            const phases = Array.from(phasesMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            return res.status(200).json(phases);
        }
        catch (error) {
            console.error('[ExecutiveFinanceController] getSettlementPhases Error:', error.message);
            return res.status(200).json([]);
        }
    }
    static async getQuasarTransactions(req, res) {
        const tenantId = (0, resolve_tenant_scope_1.resolveTenantScope)(req);
        const { date } = req.query; // YYYY-MM-DD format
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID required' });
        }
        try {
            const queryDate = date ? String(date) : new Date().toISOString().split('T')[0];
            const start = `${queryDate}T00:00:00.000Z`;
            const end = `${queryDate}T23:59:59.999Z`;
            const { data, error } = await supabase_1.supabaseAdmin
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
        }
        catch (error) {
            console.error('[ExecutiveFinanceController] getQuasarTransactions Error:', error.message);
            return res.status(500).json({ error: 'Failed to fetch Quasar transactions' });
        }
    }
    /**
     * GET /api/finance/missed-payments?since=ISO8601
     * Returns SUCCESS inbound credits for this tenant since [since],
     * so offline devices can catch up wallet credits + local notifications on reconnect.
     */
    static async getMissedPayments(req, res) {
        const tenantId = (0, resolve_tenant_scope_1.resolveTenantScope)(req);
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
            const { data, error } = await supabase_1.supabaseAdmin
                .from('transactions_log')
                .select('id, reference, amount, type, status, metadata, created_at, wallet_id')
                .eq('tenant_id', tenantId)
                .eq('status', 'SUCCESS')
                .gte('created_at', since.toISOString())
                .order('created_at', { ascending: true })
                .limit(200);
            if (error)
                throw error;
            const inboundTypes = new Set([
                'CREDIT',
                'DEPOSIT',
                'INWARD',
                'INWARD_PAYMENT',
                'VIRTUAL_ACCOUNT_CREDIT',
                '',
            ]);
            const payments = (data || [])
                .filter((tx) => inboundTypes.has(String(tx.type || '').toUpperCase()))
                .map((tx) => {
                const meta = tx.metadata || {};
                return {
                    id: tx.id,
                    reference: tx.reference,
                    amount: (0, virtual_account_funds_1.transactionAmountNaira)(tx),
                    type: 'payment.success',
                    status: tx.status,
                    createdAt: tx.created_at,
                    walletId: tx.wallet_id,
                    customerId: meta.customerId || meta.customer_id || null,
                    metadata: {
                        virtualAccountNumber: meta.virtualAccountNumber ||
                            meta.accountNumber ||
                            meta.virtual_account_number ||
                            null,
                        accountNumber: meta.accountNumber ||
                            meta.virtualAccountNumber ||
                            meta.virtual_account_number ||
                            null,
                        senderName: meta.senderName || meta.studentName || 'Unknown Sender',
                        studentName: meta.studentName || meta.senderName || 'Unknown Sender',
                        senderBank: meta.senderBank || meta.bankName || '',
                        sandbox: meta.sandbox === true,
                        paidVia: meta.paidVia || null,
                        parentKey: meta.parentKey || meta.customerId || meta.customer_id || null,
                        amountNaira: (0, virtual_account_funds_1.transactionAmountNaira)(tx),
                    },
                };
            });
            const seen = new Set(payments.map((p) => String(p.reference)));
            const { data: pendingAlerts } = await supabase_1.supabaseAdmin
                .from('payment_alert_deliveries')
                .select('id, tenant_id, reference, amount, payload, created_at, status')
                .eq('tenant_id', tenantId)
                .eq('status', 'pending')
                .limit(50);
            for (const row of pendingAlerts || []) {
                const reference = String(row.reference || '').trim();
                if (!reference || seen.has(reference))
                    continue;
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
        }
        catch (error) {
            console.error('[ExecutiveFinanceController] getMissedPayments Error:', error.message);
            return res.status(500).json({ error: 'Failed to fetch missed payments' });
        }
    }
    /**
     * GET /api/finance/student/:studentId/summary
     * School-mode ledger summary for one student / parent key.
     */
    static async getStudentSummary(req, res) {
        const tenantId = (0, resolve_tenant_scope_1.resolveTenantScope)(req);
        const studentId = String(req.params.studentId || '').trim();
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant ID required' });
        if (!studentId)
            return res.status(400).json({ error: 'Student ID is required' });
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
            const { data: invoices, error } = await supabase_1.supabaseAdmin
                .from('invoices')
                .select('amount_paid, total_amount, payment_status, customer_id')
                .eq('tenant_id', tenantId)
                .eq('customer_id', studentId);
            if (error)
                throw error;
            let totalPaid = 0;
            let outstandingBalance = 0;
            for (const inv of invoices || []) {
                totalPaid += (0, invoice_collection_1.collectedInvoiceAmount)(inv);
                outstandingBalance += (0, invoice_collection_1.outstandingInvoiceAmount)(inv);
            }
            totalPaid = (0, virtual_account_funds_1.roundNaira)(totalPaid);
            outstandingBalance = (0, virtual_account_funds_1.roundNaira)(Math.max(0, outstandingBalance));
            const totalFees = (0, virtual_account_funds_1.roundNaira)(totalPaid + outstandingBalance);
            let currentBalance = 0;
            try {
                const { data: customer } = await supabase_1.supabaseAdmin
                    .from('customers')
                    .select('wallet_balance, balance')
                    .eq('tenant_id', tenantId)
                    .or(`id.eq.${studentId},external_id.eq.${studentId}`)
                    .maybeSingle();
                currentBalance = (0, virtual_account_funds_1.roundNaira)(Number(customer?.wallet_balance ?? customer?.balance ?? 0));
            }
            catch {
                currentBalance = 0;
            }
            return res.status(200).json({
                totalFees,
                totalPaid,
                outstandingBalance,
                currentBalance,
                studentId,
            });
        }
        catch (error) {
            console.error('[ExecutiveFinanceController] getStudentSummary Error:', error.message);
            return res.status(500).json({ error: 'Failed to load student summary' });
        }
    }
    /**
     * GET /api/finance/student/:studentId/transactions
     */
    static async getStudentTransactions(req, res) {
        const tenantId = (0, resolve_tenant_scope_1.resolveTenantScope)(req);
        const studentId = String(req.params.studentId || '').trim();
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant ID required' });
        if (!studentId)
            return res.status(400).json({ error: 'Student ID is required' });
        const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
        try {
            const [invoicesRes, creditsRes] = await Promise.all([
                supabase_1.supabaseAdmin
                    .from('invoices')
                    .select('id, invoice_number, customer_name, amount_paid, payment_method, payment_status, created_at, student_id, customer_id')
                    .eq('tenant_id', tenantId)
                    .or(`student_id.eq.${studentId},customer_id.eq.${studentId}`)
                    .gt('amount_paid', 0)
                    .order('created_at', { ascending: false })
                    .limit(limit),
                supabase_1.supabaseAdmin
                    .from('transactions_log')
                    .select('id, reference, amount, type, metadata, created_at, wallet_id')
                    .eq('tenant_id', tenantId)
                    .eq('status', 'SUCCESS')
                    .in('type', ['CREDIT', 'DEPOSIT', 'INWARD', 'INWARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT'])
                    .order('created_at', { ascending: false })
                    .limit(limit * 2),
            ]);
            const channelForRail = (rail) => {
                if (rail === 'card')
                    return 'Card';
                if (rail === 'va_transfer')
                    return 'Transfer';
                if (rail === 'bank_transfer')
                    return 'Bank';
                if (rail === 'cash')
                    return 'Cash';
                if (rail === 'wallet')
                    return 'Wallet';
                return 'Other';
            };
            const items = [];
            for (const inv of invoicesRes.data || []) {
                const collected = (0, invoice_collection_1.collectedInvoiceAmount)(inv);
                if (!(collected > 0))
                    continue;
                const rail = (0, invoice_payment_method_1.classifyInvoicePaymentMethod)(inv.payment_method);
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
                const metaStudent = meta.studentId || meta.student_id || meta.customerId || meta.customer_id || meta.parentKey || '';
                const walletMatch = String(tx.wallet_id || '') === studentId;
                const metaMatch = String(metaStudent) === studentId;
                if (!walletMatch && !metaMatch)
                    continue;
                const amount = (0, virtual_account_funds_1.transactionAmountNaira)(tx);
                if (!(amount > 0))
                    continue;
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
                        virtualAccountNumber: meta.virtualAccountNumber || meta.accountNumber || meta.virtual_account_number || null,
                        quasar: true,
                    },
                });
            }
            items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            return res.status(200).json(items.slice(0, limit));
        }
        catch (error) {
            console.error('[ExecutiveFinanceController] getStudentTransactions Error:', error.message);
            return res.status(500).json({ error: 'Failed to load student transactions' });
        }
    }
    /**
     * POST /api/v1/finance/quasar-resync
     * Pull each Quasar account ledger and record credits Invify is missing.
     * Window: the newest 50 entries, plus any older entry from the last 20 days.
     */
    static async resyncQuasar(req, res) {
        const tenantId = (0, resolve_tenant_scope_1.resolveTenantScope)(req);
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID required' });
        }
        try {
            const accounts = (await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.listAccounts(tenantId)) || [];
            const cutoff = Date.now() - quasar_resync_1.QUASAR_RESYNC_DAYS * 24 * 60 * 60 * 1000;
            const credits = [];
            for (const account of accounts) {
                const accountId = String(account?.id || account?.account_id || '').trim();
                if (!accountId)
                    continue;
                const va = String(account?.accountNumber || account?.account_number || '').trim();
                const collected = [];
                let offset = 0;
                for (let page = 0; page < 8; page += 1) {
                    const raw = await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.getLedger(tenantId, accountId, 50, offset, { noRetry: true, timeoutMs: 8000 });
                    const rows = Array.isArray(raw) ? raw : [];
                    if (rows.length === 0)
                        break;
                    collected.push(...rows);
                    offset += rows.length;
                    if (rows.length < 50)
                        break;
                    const oldest = (0, quasar_resync_1.quasarEntryTimestamp)(rows[rows.length - 1]);
                    if (page > 0 && (!Number.isFinite(oldest) || oldest < cutoff))
                        break;
                }
                for (const entry of (0, quasar_resync_1.selectQuasarResyncEntries)(collected)) {
                    if (!(0, quasar_resync_1.isQuasarCreditEntry)(entry))
                        continue;
                    const amount = (0, quasar_resync_1.quasarLedgerAmountNaira)(entry);
                    const reference = (0, quasar_resync_1.quasarLedgerReference)(entry, accountId);
                    if (!(amount > 0) || !reference)
                        continue;
                    const ts = (0, quasar_resync_1.quasarEntryTimestamp)(entry);
                    credits.push({
                        reference,
                        amount,
                        va,
                        createdAt: Number.isFinite(ts) ? new Date(ts).toISOString() : new Date().toISOString(),
                    });
                }
            }
            const unique = new Map();
            for (const credit of credits) {
                if (!unique.has(credit.reference))
                    unique.set(credit.reference, credit);
            }
            const wanted = [...unique.values()];
            const references = wanted.map((c) => c.reference);
            const existingRefs = new Set();
            const existingCredits = [];
            const { data: logged, error: loggedErr } = await supabase_1.supabaseAdmin
                .from('transactions_log')
                .select('reference, amount, created_at, metadata')
                .eq('tenant_id', tenantId)
                .eq('status', 'SUCCESS')
                .order('created_at', { ascending: false })
                .limit(200);
            if (loggedErr)
                throw loggedErr;
            for (const row of logged || []) {
                if (row?.reference)
                    existingRefs.add(String(row.reference));
                existingCredits.push({
                    reference: String(row.reference || ''),
                    amount: (0, virtual_account_funds_1.transactionAmountNaira)(row),
                    createdAt: String(row.created_at || ''),
                });
            }
            for (let i = 0; i < references.length; i += 100) {
                const slice = references.slice(i, i + 100);
                if (slice.length === 0)
                    continue;
                const { data, error } = await supabase_1.supabaseAdmin
                    .from('transactions_log')
                    .select('reference')
                    .eq('tenant_id', tenantId)
                    .in('reference', slice);
                if (error)
                    throw error;
                for (const row of data || []) {
                    if (row?.reference)
                        existingRefs.add(String(row.reference));
                }
            }
            let imported = 0;
            const errors = [];
            let io = null;
            try {
                io = require('../app').io;
            }
            catch {
                io = null;
            }
            for (const credit of wanted) {
                const already = existingRefs.has(credit.reference) ||
                    existingCredits.some((row) => (0, quasar_resync_1.isSameQuasarCredit)(row, credit));
                if (already)
                    continue;
                const { error } = await supabase_1.supabaseAdmin.from('transactions_log').insert({
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
                    await (0, payment_alert_quasar_sync_1.postSyncedCreditToWallet)(tenantId, credit.reference, credit.amount, credit.va);
                }
                catch (walletErr) {
                    console.warn(`[QuasarResync] wallet skip ${credit.reference}:`, walletErr?.message || walletErr);
                }
                try {
                    await payment_alert_trail_service_1.PaymentAlertTrailService.recordAndEmit(io, {
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
                }
                catch (alertErr) {
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
                window: { latest: 50, days: quasar_resync_1.QUASAR_RESYNC_DAYS },
            });
        }
        catch (error) {
            console.error('[ExecutiveFinanceController] resyncQuasar Error:', error.message);
            return res.status(500).json({ error: 'Could not resync Quasar transactions' });
        }
    }
}
exports.ExecutiveFinanceController = ExecutiveFinanceController;
//# sourceMappingURL=finance.controller.js.map