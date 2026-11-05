"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerController = void 0;
const factory_1 = require("../integrations/quasar/factory");
const audit_service_1 = require("../services/audit.service");
const customer_service_1 = require("../services/customer.service");
const supabase_1 = require("../db/supabase");
const wallet_service_1 = require("../services/wallet.service");
const virtual_account_ownership_1 = require("../services/virtual-account-ownership");
const free_trial_guard_1 = require("../utils/free-trial-guard");
const finance_tenant_1 = require("../utils/finance-tenant");
const qfs_quasar_bridge_service_1 = require("../services/qfs-quasar-bridge.service");
const virtual_account_funds_1 = require("../utils/virtual-account-funds");
const invoice_payment_method_1 = require("../utils/invoice-payment-method");
const invoice_collection_1 = require("../utils/invoice-collection");
function tenantFromRequest(req, res) {
    try {
        return (0, finance_tenant_1.resolveAuthoritativeTenantId)(req);
    }
    catch (err) {
        const status = err?.status || 403;
        res.status(status).json({ error: err?.message || 'Forbidden: Cross-tenant access denied' });
        return null;
    }
}
class CustomerController {
    /**
     * POST /api/finance/customer-virtual-account/:customerId
     */
    static async getVirtualAccount(req, res) {
        try {
            const { customerId } = req.params;
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const { name, email, phone } = req.body;
            if (!customerId)
                return res.status(400).json({ error: "Customer ID is required" });
            if (!tenantId)
                return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
            if (await (0, free_trial_guard_1.rejectIfVaBlocked)(res, tenantId))
                return;
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
            const { data: existing } = await supabase_1.supabaseAdmin
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
            const quasar = await (0, factory_1.getQuasarService)(tenantId);
            const reference = `VA-CUST-${customerId.substring(0, 8)}-${Date.now()}`;
            const quasarAccount = await quasar.createVirtualAccount({
                childId: customerId,
                parentId: tenantId,
                email: email || `customer-${customerId.substring(0, 8)}@invify.com`,
                phone: String(phone).trim(),
                firstName: name?.split(' ')[0] || 'Valued',
                lastName: name?.split(' ').slice(1).join(' ') || 'Customer',
                metadata: { source: 'customer_provisioning', phone: phone }
            });
            const acctName = quasarAccount.accountName || name;
            // Save to Supabase customers table
            await supabase_1.supabaseAdmin
                .from('customers')
                .update({
                virtual_account_number: quasarAccount.accountNumber,
                virtual_account_bank: quasarAccount.bankName,
                virtual_account_name: acctName,
                updated_at: new Date().toISOString()
            })
                .eq('id', customerId)
                .eq('tenant_id', tenantId);
            await audit_service_1.AuditService.log({
                eventType: 'virtual_account.created',
                reference,
                tenantId: tenantId,
                payload: { customerId, accountNumber: quasarAccount.accountNumber, bankName: quasarAccount.bankName }
            });
            return res.status(200).json({
                accountNumber: quasarAccount.accountNumber,
                bankName: quasarAccount.bankName,
                accountName: acctName
            });
        }
        catch (error) {
            console.error('[CustomerController] getVirtualAccount Error:', error.message);
            return res.status(classifyVaProvisionStatus(error)).json(vaProvisionErrorPayload(error, 'customer'));
        }
    }
    static async searchCustomers(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            if (!tenantId)
                return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
            const options = {
                page: parseInt(req.query.page) || 1,
                pageSize: parseInt(req.query.pageSize) || 500,
                search: req.query.search,
                sort: req.query.sort,
                direction: req.query.direction,
                status: req.query.status,
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo
            };
            const result = await customer_service_1.customerService.searchCustomers(tenantId, options);
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('[CustomerController] searchCustomers Error:', error.message);
            return res.status(500).json({ error: "Failed to search customers" });
        }
    }
    static async getCustomerSummary(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const customerId = req.params.id;
            if (!tenantId)
                return res.status(401).json({ error: "Unauthorized" });
            const summary = await customer_service_1.customerService.getCustomerSummary(tenantId, customerId);
            if (!summary)
                return res.status(404).json({ error: "Customer not found" });
            return res.status(200).json(summary);
        }
        catch (error) {
            console.error('[CustomerController] getCustomerSummary Error:', error.message);
            return res.status(500).json({ error: "Failed to fetch customer summary" });
        }
    }
    static async createCustomer(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            if (!tenantId)
                return res.status(401).json({ error: "Unauthorized" });
            const customer = await customer_service_1.customerService.createCustomer(tenantId, req.body);
            return res.status(201).json(customer);
        }
        catch (error) {
            console.error('[CustomerController] createCustomer Error:', error.message);
            return res.status(500).json({ error: "Failed to create customer" });
        }
    }
    static async bulkSyncCustomers(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const { customers } = req.body;
            if (!tenantId)
                return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
            if (!Array.isArray(customers) || customers.length === 0) {
                return res.status(400).json({ error: 'customers array is required and must not be empty.' });
            }
            const result = await customer_service_1.customerService.bulkUpsertCustomers(tenantId, customers);
            await audit_service_1.AuditService.log({
                eventType: 'customer.bulk_sync',
                reference: `CUST-BULK-SYNC-${tenantId}`,
                tenantId,
                payload: { synced: result.synced, errors: result.errors.length },
            });
            return res.status(200).json({
                success: result.errors.length === 0,
                synced: result.synced,
                errors: result.errors,
            });
        }
        catch (e) {
            console.error('[CustomerController] bulkSyncCustomers Error:', e.message);
            return res.status(500).json({ error: e.message });
        }
    }
    static async updateCustomer(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const customerId = req.params.id;
            if (!tenantId)
                return res.status(401).json({ error: "Unauthorized" });
            const customer = await customer_service_1.customerService.updateCustomer(tenantId, customerId, req.body);
            return res.status(200).json(customer);
        }
        catch (error) {
            console.error('[CustomerController] updateCustomer Error:', error.message);
            return res.status(500).json({ error: "Failed to update customer" });
        }
    }
    static async getStaffVirtualAccount(req, res) {
        try {
            const { userId } = req.params;
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const { customLastName, email, phone } = req.body;
            if (!userId)
                return res.status(400).json({ error: "Staff User ID is required" });
            if (!tenantId)
                return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
            if (await (0, free_trial_guard_1.rejectIfVaBlocked)(res, tenantId))
                return;
            if (!customLastName || customLastName.trim() === '') {
                return res.status(400).json({ error: "Custom second name is required" });
            }
            // Fetch tenant/business details for the business name
            const { data: tenant, error: tenantErr } = await supabase_1.supabaseAdmin
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
                const { data: staffUser } = await supabase_1.supabaseAdmin
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();
                if (staffUser) {
                    if (staffUser.email)
                        defaultEmail = staffUser.email;
                    if (staffUser.phone)
                        defaultPhone = staffUser.phone;
                }
            }
            catch (dbErr) {
                // Safe to ignore if table/record query fails, fall back to default email
            }
            const quasar = await (0, factory_1.getQuasarService)(tenantId);
            const platformId = 'platform-admin-owner-id';
            const staffPhone = String(phone || defaultPhone || '').trim();
            if (!staffPhone) {
                return res.status(400).json({ error: 'Customer phone number is required' });
            }
            const quasarAccount = await quasar.createVirtualAccount({
                childId: userId,
                parentId: platformId,
                email: email || defaultEmail,
                phone: staffPhone,
                firstName: companyName,
                lastName: customLastName,
                parentShareBps: 0,
                metadata: {
                    type: 'staff_account',
                    tenantId: tenantId,
                    phone: staffPhone
                }
            });
            // Save to Supabase users table
            await supabase_1.supabaseAdmin
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
        }
        catch (error) {
            console.error('[CustomerController] getStaffVirtualAccount Error:', error.message);
            return res.status(classifyVaProvisionStatus(error)).json(vaProvisionErrorPayload(error, 'staff'));
        }
    }
    static async listTenantVirtualAccounts(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            if (!tenantId)
                return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
            // 1. Fetch Customers with virtual accounts
            const { data: customers, error: custErr } = await supabase_1.supabaseAdmin
                .from('customers')
                .select('id, name, phone, email, virtual_account_number, virtual_account_bank, virtual_account_name, balance')
                .eq('tenant_id', tenantId)
                .not('virtual_account_number', 'is', null);
            if (custErr)
                throw custErr;
            // 2. Fetch Staff with virtual accounts
            let staff = [];
            try {
                const { data: staffData, error: staffErr } = await supabase_1.supabaseAdmin
                    .from('users')
                    .select('id, name, email, phone, virtual_account_number, virtual_account_bank, virtual_account_name')
                    .eq('tenant_id', tenantId)
                    .not('virtual_account_number', 'is', null);
                if (staffErr) {
                    console.warn('[CustomerController] users table query failed (columns might be missing):', staffErr.message);
                }
                else {
                    staff = staffData || [];
                }
            }
            catch (err) {
                console.warn('[CustomerController] users table query threw exception:', err.message);
            }
            // 3. Load SUCCESS txs once, then compute pending per VA from real credits − sweeps
            const { data: txns, error: txErr } = await supabase_1.supabaseAdmin
                .from('transactions_log')
                .select('amount, type, status, metadata, reference')
                .eq('tenant_id', tenantId)
                .eq('status', 'SUCCESS')
                .limit(1000);
            if (txErr) {
                console.warn('[CustomerController] transactions_log query failed:', txErr.message);
            }
            const pendingByVa = computePendingFundsByVa(txns || []);
            const appliedByVa = new Map();
            try {
                const [{ data: roster }, { data: invoices, error: invErr }] = await Promise.all([
                    supabase_1.supabaseAdmin
                        .from('students')
                        .select('id, parent_id, virtual_account_number')
                        .or(`tenant_id.eq.${tenantId},school_id.eq.${tenantId}`),
                    supabase_1.supabaseAdmin
                        .from('invoices')
                        .select('customer_id, student_id, amount_paid, payment_method, payment_status, invoice_number, total_amount')
                        .eq('tenant_id', tenantId),
                ]);
                if (invErr) {
                    console.warn('[CustomerController] invoice allocation query failed:', invErr.message);
                }
                const vaByStudentId = new Map();
                const vasByParentId = new Map();
                const vaByCustomerId = new Map();
                for (const c of customers || []) {
                    const va = String(c.virtual_account_number || '').trim();
                    if (!va)
                        continue;
                    vaByCustomerId.set(String(c.id), va);
                    const rawId = String(c.id || '');
                    const parentKey = rawId.toLowerCase().startsWith('par-') ? rawId.slice(4) : rawId;
                    if (!vasByParentId.has(parentKey))
                        vasByParentId.set(parentKey, new Set());
                    vasByParentId.get(parentKey).add(va);
                }
                for (const st of roster || []) {
                    const va = String(st.virtual_account_number || '').trim();
                    if (va)
                        vaByStudentId.set(String(st.id), va);
                    const parentKey = String(st.parent_id || '').trim();
                    if (!parentKey)
                        continue;
                    if (!vasByParentId.has(parentKey))
                        vasByParentId.set(parentKey, new Set());
                    if (va)
                        vasByParentId.get(parentKey).add(va);
                }
                for (const inv of invoices || []) {
                    if (String(inv.invoice_number || '').startsWith('PMT-'))
                        continue;
                    if ((0, invoice_payment_method_1.classifyInvoicePaymentMethod)(inv.payment_method) !== 'wallet')
                        continue;
                    const collected = (0, invoice_collection_1.collectedInvoiceAmount)(inv);
                    if (!(collected > 0))
                        continue;
                    const targets = new Set();
                    const studentVa = vaByStudentId.get(String(inv.student_id || ''));
                    if (studentVa)
                        targets.add(studentVa);
                    const student = (roster || []).find((s) => String(s.id) === String(inv.student_id || ''));
                    const parentKey = String(student?.parent_id || '').trim();
                    for (const va of vasByParentId.get(parentKey) || [])
                        targets.add(va);
                    const customerVa = vaByCustomerId.get(String(inv.customer_id || ''));
                    if (customerVa)
                        targets.add(customerVa);
                    for (const va of targets) {
                        appliedByVa.set(va, (0, virtual_account_funds_1.roundNaira)((appliedByVa.get(va) || 0) + collected));
                    }
                }
            }
            catch (err) {
                console.warn('[CustomerController] invoice allocation threw:', err?.message || err);
            }
            const leftover = (va) => (0, virtual_account_funds_1.roundNaira)(Math.max(0, (pendingByVa.get(va) || 0) - (appliedByVa.get(va) || 0)));
            const list = [];
            for (const c of (customers || [])) {
                const va = String(c.virtual_account_number || '').trim();
                const pendingBalance = leftover(va);
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
            // 3b. School students with dedicated VAs
            try {
                const { data: students, error: stuErr } = await supabase_1.supabaseAdmin
                    .from('students')
                    .select('id, first_name, last_name, admission_number, virtual_account_number, virtual_account_bank, virtual_account_status')
                    .or(`tenant_id.eq.${tenantId},school_id.eq.${tenantId}`)
                    .not('virtual_account_number', 'is', null);
                if (stuErr) {
                    console.warn('[CustomerController] students VA query failed:', stuErr.message);
                }
                else {
                    for (const st of (students || [])) {
                        const va = String(st.virtual_account_number || '').trim();
                        if (!va || list.some((row) => row.accountNumber === va))
                            continue;
                        const pendingBalance = leftover(va);
                        const name = `${st.first_name || ''} ${st.last_name || ''}`.trim() || st.admission_number || 'Student';
                        list.push({
                            id: st.id,
                            name,
                            phone: 'N/A',
                            email: 'N/A',
                            accountNumber: st.virtual_account_number,
                            bankName: st.virtual_account_bank || 'Quasar Sandbox Bank',
                            accountName: name,
                            holderType: 'Student',
                            balance: pendingBalance,
                        });
                    }
                }
            }
            catch (err) {
                console.warn('[CustomerController] students VA query threw:', err.message);
            }
            return res.status(200).json(list);
        }
        catch (error) {
            console.error('[CustomerController] listTenantVirtualAccounts Error:', error.message);
            return res.status(500).json({ error: "Failed to list tenant virtual accounts" });
        }
    }
    static async getVirtualAccountTransactions(req, res) {
        try {
            const { accountNumber } = req.params;
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            if (!tenantId)
                return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
            if (!accountNumber)
                return res.status(400).json({ error: "accountNumber is required" });
            const va = String(accountNumber).trim();
            // Pull successful txs for this tenant, then match to the staff VA in metadata.
            const { data: txns, error } = await supabase_1.supabaseAdmin
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
            const rows = WebHookFormatVaTxns(txns || [], va);
            const quasarBalance = await lookupQuasarVaBalanceNaira(tenantId, va);
            for (const row of rows) {
                row.metadata = {
                    ...(row.metadata || {}),
                    liveBalance: quasarBalance,
                };
            }
            if (Number.isFinite(quasarBalance) && quasarBalance >= 0) {
                await syncParentCreditToVaNet(tenantId, va, quasarBalance);
            }
            return res.status(200).json(rows);
        }
        catch (error) {
            console.error('[CustomerController] getVirtualAccountTransactions Error:', error.message);
            return res.status(500).json({ error: "Failed to fetch virtual account transactions" });
        }
    }
    static async sweepVirtualAccountFunds(req, res) {
        try {
            const { accountNumber } = req.params;
            const { amount } = req.body;
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            if (!tenantId)
                return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
            if (!amount || amount <= 0)
                return res.status(400).json({ error: "Invalid sweep amount" });
            const va = String(accountNumber).trim();
            const ownership = await (0, virtual_account_ownership_1.loadVirtualAccountKind)(va, { tenantId });
            if (!(0, virtual_account_ownership_1.creditsSchoolWallet)(ownership.kind)) {
                return res.status(409).json({
                    error: ownership.kind === 'parent'
                        ? 'This virtual account belongs to a parent. Those funds are not swept into the school wallet.'
                        : 'This virtual account is not a proven school or staff account. Those funds were not swept into the school wallet.',
                });
            }
            const { data: wallet, error: walletErr } = await supabase_1.supabaseAdmin
                .from('wallets')
                .select('*')
                .eq('tenant_id', tenantId)
                .single();
            if (walletErr || !wallet) {
                return res.status(404).json({ error: "Tenant wallet not found" });
            }
            const { data: inbound } = await supabase_1.supabaseAdmin
                .from('transactions_log')
                .select('type, metadata')
                .eq('tenant_id', tenantId)
                .eq('status', 'SUCCESS')
                .in('type', ['CREDIT', 'DEPOSIT', 'INWARD', 'INWARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT'])
                .limit(500);
            const alreadyInWallet = (inbound || []).some((tx) => extractVaFromMetadata(tx.metadata) === va);
            let newBalance = Number(wallet.balance);
            if (!alreadyInWallet) {
                const idempotencyKey = `sweep-va:${tenantId}:${va}`;
                const ledgerRef = `SWEEP-VA-${va.substring(0, 6)}`;
                const posted = await supabase_1.supabaseAdmin.rpc('process_ledger_double_entry_text', {
                    p_tenant_id: tenantId,
                    p_idempotency_key: idempotencyKey,
                    p_reference: ledgerRef,
                    p_entries: [
                        { account: 'USER_WALLET', type: 'CREDIT', amount: (0, virtual_account_funds_1.roundNaira)(Number(amount)) },
                        { account: 'EXTERNAL_BANK', type: 'DEBIT', amount: (0, virtual_account_funds_1.roundNaira)(Number(amount)) },
                    ],
                    p_metadata: { source: 'virtual_account_sweep', accountNumber: va }
                });
                if (posted.error && !String(posted.error.message || '').toLowerCase().includes('duplicate')) {
                    throw new Error(posted.error.message || 'sweep ledger failed');
                }
                const derived = await wallet_service_1.WalletService.getBalance(tenantId);
                newBalance = Number(derived?.balance || 0);
                await supabase_1.supabaseAdmin
                    .from('wallets')
                    .update({
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                })
                    .eq('id', wallet.id);
            }
            const reference = `SWEEP-VA-${va}`;
            const { data: existingSweep } = await supabase_1.supabaseAdmin
                .from('transactions_log')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('reference', reference)
                .limit(1);
            if (!existingSweep?.length) {
                await supabase_1.supabaseAdmin.from('transactions_log').insert({
                    reference,
                    tenant_id: tenantId,
                    wallet_id: wallet.id,
                    amount: Number(amount),
                    type: 'SWEEP',
                    provider: 'quasar',
                    status: 'SUCCESS',
                    metadata: {
                        virtualAccountNumber: va,
                        accountNumber: va,
                        source: 'virtual_account_sweep',
                        amountNaira: Number(amount),
                        alreadyInWallet,
                    },
                });
            }
            return res.status(200).json({
                success: true,
                message: alreadyInWallet
                    ? `Cleared ₦${Number(amount).toFixed(2)} from this virtual account. Those funds were already in the school wallet when the parent paid in.`
                    : `Successfully swept ₦${Number(amount).toFixed(2)} to internal wallet`,
                newBalance
            });
        }
        catch (error) {
            console.error('[CustomerController] sweepVirtualAccountFunds Error:', error.message);
            return res.status(500).json({ error: "Failed to sweep virtual account funds" });
        }
    }
}
exports.CustomerController = CustomerController;
async function lookupQuasarVaBalanceNaira(tenantId, accountNumber) {
    const recorded = await recordedParentVaNetNaira(tenantId, accountNumber);
    const spentOnBills = await schoolWalletBillNaira(tenantId, accountNumber);
    const net = (0, virtual_account_funds_1.roundNaira)(Math.max(0, recorded - spentOnBills));
    try {
        const accounts = await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.listAccounts(tenantId);
        const want = String(accountNumber).replace(/\D/g, '');
        const match = (accounts || []).find((row) => {
            const got = String(row?.account_number || row?.accountNumber || '').replace(/\D/g, '');
            return got.length >= 8 && got === want;
        });
        if (match)
            return (0, virtual_account_funds_1.sandboxBalanceToNaira)(match);
    }
    catch (err) {
        console.warn('[CustomerController] Quasar VA balance lookup failed:', err?.message || err);
    }
    return net;
}
/** Bills already moved from this parent into the school wallet. Not part of parent credit. */
async function schoolWalletBillNaira(tenantId, accountNumber) {
    const va = String(accountNumber).replace(/\D/g, '');
    if (va.length < 8)
        return 0;
    const { data, error } = await supabase_1.supabaseAdmin
        .from('school_entities')
        .select('payload')
        .eq('tenant_id', tenantId)
        .eq('entity_type', 'parent')
        .filter('payload->>virtualAccountNumber', 'eq', va)
        .limit(1);
    if (error || !data?.length)
        return 0;
    const stored = Number(data[0].payload?.schoolWalletBillNaira);
    const storedNaira = Number.isFinite(stored) && stored > 0 ? stored : 0;
    const parentId = data[0].payload?.id;
    let mapped = 0;
    try {
        const { data: pays } = await supabase_1.supabaseAdmin
            .from('school_entities')
            .select('payload')
            .eq('tenant_id', tenantId)
            .eq('entity_type', 'parent_payment')
            .limit(500);
        for (const row of pays || []) {
            const p = row.payload || {};
            const sameParent = parentId != null && String(p.parentId) === String(parentId);
            const payVa = String(p.virtualAccountNumber || '').replace(/\D/g, '');
            const sameVa = payVa.length >= 8 && payVa === va;
            if (!sameParent && !sameVa)
                continue;
            if (String(p.source || '') !== 'credit_map')
                continue;
            const amt = Number(p.appliedToDebt != null ? p.appliedToDebt : p.amount);
            if (Number.isFinite(amt) && amt > 0)
                mapped += amt;
        }
    }
    catch (err) {
        console.warn('[CustomerController] mapped credit lookup failed:', err?.message || err);
    }
    return (0, virtual_account_funds_1.roundNaira)(Math.max(storedNaira, mapped));
}
/** Save parent credit as virtual-account receipts minus bills already moved to the school wallet. */
async function syncParentCreditToVaNet(tenantId, accountNumber, balance) {
    const va = String(accountNumber).replace(/\D/g, '');
    if (va.length < 8 || !Number.isFinite(Number(balance)))
        return;
    const { data, error } = await supabase_1.supabaseAdmin
        .from('school_entities')
        .select('payload')
        .eq('tenant_id', tenantId)
        .eq('entity_type', 'parent')
        .filter('payload->>virtualAccountNumber', 'eq', va)
        .limit(1);
    if (error || !data?.length)
        return;
    const current = Number(data[0].payload?.creditBalance) || 0;
    const gross = await recordedParentVaNetNaira(tenantId, accountNumber);
    const spent = await schoolWalletBillNaira(tenantId, accountNumber);
    const remaining = (0, virtual_account_funds_1.roundNaira)(Math.max(0, Number(balance || 0) - spent));
    const wrongGross = gross > 0 && Math.abs(current - gross) <= 0.009;
    if (Math.abs(current - remaining) <= 0.009)
        return;
    // A mapped bill payment lowers local credit. Do not write the live VA
    // balance back over that debit unless the stored figure is still the gross VA in.
    if (current + 0.009 < remaining && !wrongGross)
        return;
    const payload = {
        ...(data[0].payload || {}),
        creditBalance: remaining,
        schoolWalletBillNaira: spent,
    };
    await supabase_1.supabaseAdmin
        .from('school_entities')
        .update({ payload, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('entity_type', 'parent')
        .filter('payload->>virtualAccountNumber', 'eq', va);
}
/** Credits already logged for this virtual account, minus sweeps. Used when Quasar will not return the live balance. */
async function recordedParentVaNetNaira(tenantId, accountNumber) {
    const va = String(accountNumber).replace(/\D/g, '');
    if (va.length < 8)
        return 0;
    const { data, error } = await supabase_1.supabaseAdmin
        .from('transactions_log')
        .select('id, type, amount, reference, metadata, created_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'SUCCESS')
        .or(`metadata->>accountNumber.eq.${va},metadata->>virtualAccountNumber.eq.${va}`)
        .limit(500);
    if (error || !data)
        return 0;
    const pending = computePendingFundsByVa(data);
    for (const [key, value] of pending) {
        if (String(key).replace(/\D/g, '') === va)
            return (0, virtual_account_funds_1.roundNaira)(value);
    }
    return 0;
}
/** Match SUCCESS txs to a staff VA number across Quasar metadata key variants. */
function extractVaFromMetadata(meta) {
    if (!meta || typeof meta !== 'object')
        return null;
    const candidates = [
        meta.virtualAccountNumber,
        meta.accountNumber,
        meta.virtual_account_number,
        meta.account_number,
        meta?.metadata?.virtualAccountNumber,
        meta?.metadata?.accountNumber,
    ]
        .filter(Boolean)
        .map((v) => String(v).trim());
    return candidates[0] || null;
}
/**
 * Pending funds per VA = inbound CREDIT/DEPOSIT − SWEEP/DEBIT outflows.
 * No hardcoded demo balances.
 */
function computePendingFundsByVa(txns) {
    const inbound = new Set([
        'CREDIT',
        'DEPOSIT',
        'INWARD',
        'INWARD_PAYMENT',
        'VIRTUAL_ACCOUNT_CREDIT',
    ]);
    const outbound = new Set(['SWEEP', 'DEBIT', 'WITHDRAWAL']);
    const map = new Map();
    // Deduplicate by VA+reference so pending matches customer Funds totals.
    const seenInbound = new Set();
    const seenOutbound = new Set();
    for (const tx of txns || []) {
        const va = extractVaFromMetadata(tx.metadata);
        if (!va)
            continue;
        const amount = Number(tx.metadata?.amountNaira ?? tx.metadata?.amount_naira ?? tx.amount) || 0;
        if (!Number.isFinite(amount) || amount <= 0)
            continue;
        const type = String(tx.type || '').toUpperCase();
        const ref = String(tx.reference || tx.id || '').trim();
        const key = `${va}:${ref || `${type}:${amount}:${tx.created_at || ''}`}`;
        const current = map.get(va) || 0;
        if (inbound.has(type) || type === '') {
            if (seenInbound.has(key))
                continue;
            seenInbound.add(key);
            map.set(va, current + amount);
        }
        else if (outbound.has(type)) {
            if (seenOutbound.has(key))
                continue;
            seenOutbound.add(key);
            map.set(va, Math.max(0, current - amount));
        }
    }
    return map;
}
function WebHookFormatVaTxns(txns, accountNumber) {
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
        if (!inboundTypes.has(rawType))
            return false;
        const meta = tx.metadata || {};
        const digits = (value) => String(value || '').replace(/\D/g, '');
        const want = digits(va);
        const candidates = [
            meta.virtualAccountNumber,
            meta.accountNumber,
            meta.virtual_account_number,
            meta.account_number,
            meta?.metadata?.virtualAccountNumber,
            meta?.metadata?.accountNumber,
        ]
            .filter(Boolean)
            .map((v) => String(v).trim());
        return candidates.includes(va) || (want.length >= 8 && candidates.some((c) => digits(c) === want));
    });
    return matched.map((tx) => {
        const rawType = String(tx.type || 'CREDIT').toUpperCase();
        const normalizedType = rawType === 'DEPOSIT' || rawType === 'INWARD' || rawType === 'VIRTUAL_ACCOUNT_CREDIT' || rawType === ''
            ? 'CREDIT'
            : rawType;
        return {
            id: tx.id,
            amount: (0, virtual_account_funds_1.transactionAmountNaira)(tx),
            type: normalizedType,
            reference: tx.reference,
            status: tx.status,
            createdAt: tx.created_at,
            metadata: tx.metadata || {},
        };
    });
}
function isVaCredentialsError(error) {
    const msg = String(error?.message || error || '').toLowerCase();
    return (msg.includes('credential') ||
        msg.includes('quasar_api_key') ||
        msg.includes('api key') ||
        msg.includes('not found for tenant') ||
        msg.includes('not configured') ||
        msg.includes('sk_test') ||
        msg.includes('sk_live') ||
        msg.includes('integration vault') ||
        msg.includes('unauthorized') ||
        msg.includes('invalid api key') ||
        msg.includes('authentication failed'));
}
function classifyVaProvisionStatus(error) {
    return isVaCredentialsError(error) ? 503 : 500;
}
function vaProvisionErrorPayload(error, kind) {
    if (isVaCredentialsError(error)) {
        return {
            code: 'VA_CREDENTIALS_REQUIRED',
            error: kind === 'staff'
                ? 'Virtual account credentials are not activated for this business.'
                : 'Virtual account credentials are not activated for this business.',
            action: 'Open the Invify Admin web portal → Integration Vault (or Platform Config) and activate / save Quasar VA credentials for this tenant. Then try Generate again.',
        };
    }
    return {
        code: 'VA_PROVISION_FAILED',
        error: kind === 'staff'
            ? 'Failed to provision staff virtual account'
            : 'Failed to provision customer virtual account',
        action: 'If this keeps happening, ask your administrator to confirm VA credentials are activated in the Invify Admin web portal.',
    };
}
//# sourceMappingURL=customer.controller.js.map