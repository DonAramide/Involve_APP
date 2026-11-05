"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshAllQuasarVirtualAccounts = refreshAllQuasarVirtualAccounts;
exports.applySyncedVirtualAccounts = applySyncedVirtualAccounts;
const supabase_1 = require("../db/supabase");
const qfs_quasar_bridge_service_1 = require("./qfs-quasar-bridge.service");
const quasar_api_client_1 = require("../integrations/quasar/quasar-api.client");
const virtual_account_funds_1 = require("../utils/virtual-account-funds");
const SYNC_TYPES = ['quasar_virtual_account', 'parent_virtual_account', 'parent'];
function accountFromPayload(payload) {
    return String(payload?.accountNumber ||
        payload?.virtualAccountNumber ||
        payload?.virtual_account_number ||
        '').trim();
}
async function refreshAllQuasarVirtualAccounts() {
    const { data: integrations, error } = await supabase_1.supabaseAdmin
        .from('quasar_integrations')
        .select('invify_tenant_id')
        .limit(500);
    if (error)
        throw new Error(error.message);
    const { data: tenantRows } = await supabase_1.supabaseAdmin.from('tenants').select('id, name').limit(500);
    const names = new Map();
    for (const tenant of tenantRows || [])
        names.set(String(tenant.id), tenant.name);
    const seenTenants = new Set();
    let accounts = 0;
    let saved = 0;
    const failed = [];
    for (const integration of integrations || []) {
        const tenantId = String(integration.invify_tenant_id || '').trim();
        if (!tenantId || seenTenants.has(tenantId))
            continue;
        seenTenants.add(tenantId);
        quasar_api_client_1.QuasarApiClient.resetCircuit();
        try {
            const live = (await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.listAccounts(tenantId)) || [];
            for (const account of live) {
                const accountNumber = String(account.accountNumber || account.account_number || '').trim();
                if (!accountNumber)
                    continue;
                accounts += 1;
                const payload = {
                    accountNumber,
                    accountName: account.accountName || account.account_name || accountNumber,
                    bankName: account.bankName || account.bank_name || 'Quasar',
                    status: account.status || (account.is_active === false ? 'INACTIVE' : 'ACTIVE'),
                    quasarBalance: (0, virtual_account_funds_1.sandboxBalanceToNaira)(account),
                    quasarAccountId: account.id || null,
                };
                const { error: saveError } = await supabase_1.supabaseAdmin.from('school_entities').upsert({
                    tenant_id: tenantId,
                    entity_type: 'quasar_virtual_account',
                    sync_id: accountNumber,
                    payload,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'tenant_id,entity_type,sync_id' });
                if (saveError)
                    throw new Error(saveError.message);
                saved += 1;
            }
        }
        catch (err) {
            failed.push({
                tenantId,
                tenantName: names.get(tenantId) || null,
                error: String(err?.message || err),
            });
        }
    }
    return { tenants: seenTenants.size, accounts, saved, failed };
}
async function applySyncedVirtualAccounts(rows, names) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('school_entities')
        .select('tenant_id, entity_type, payload')
        .in('entity_type', SYNC_TYPES)
        .limit(2000);
    if (error || !data)
        return rows;
    const byNumber = new Map();
    for (const row of rows) {
        const number = String(row.accountNumber || '').trim();
        if (number)
            byNumber.set(number, row);
    }
    for (const entity of data) {
        const payload = entity.payload && typeof entity.payload === 'object' ? entity.payload : {};
        const accountNumber = accountFromPayload(payload);
        if (!accountNumber)
            continue;
        const quasarBalance = payload.quasarBalance;
        const existing = byNumber.get(accountNumber);
        if (existing) {
            if (quasarBalance != null && quasarBalance !== '')
                existing.quasarBalance = Number(quasarBalance);
            continue;
        }
        if (entity.entity_type !== 'quasar_virtual_account')
            continue;
        const tenantId = String(entity.tenant_id || '');
        const tenant = names.get(tenantId);
        const row = {
            id: `quasar:${accountNumber}`,
            tenantId,
            tenantName: tenant?.name || '—',
            tenantType: tenant?.type || '—',
            holderType: 'Quasar',
            holderName: payload.accountName || accountNumber,
            holderId: payload.quasarAccountId || null,
            accountNumber,
            bankName: payload.bankName || 'Quasar',
            accountName: payload.accountName || accountNumber,
            status: payload.status || 'ACTIVE',
            balance: 0,
            quasarBalance: quasarBalance == null || quasarBalance === '' ? null : Number(quasarBalance),
        };
        rows.push(row);
        byNumber.set(accountNumber, row);
    }
    return rows;
}
//# sourceMappingURL=virtual-account-inventory.js.map