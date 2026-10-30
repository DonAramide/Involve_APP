"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vaInwardChargeNaira = vaInwardChargeNaira;
exports.deductVaInwardCharge = deductVaInwardCharge;
const supabase_1 = require("../db/supabase");
const FeeCalculator_1 = require("../modules/fee-orchestration/FeeCalculator");
const ledger_service_1 = require("./ledger.service");
const wallet_service_1 = require("./wallet.service");
const virtual_account_funds_1 = require("../utils/virtual-account-funds");
function vaInwardChargeNaira(creditNaira, feeNaira) {
    const credit = (0, virtual_account_funds_1.roundNaira)(creditNaira);
    const fee = (0, virtual_account_funds_1.roundNaira)(feeNaira);
    if (!(credit > 0) || !(fee > 0))
        return 0;
    return (0, virtual_account_funds_1.roundNaira)(Math.min(fee, credit));
}
async function publishedFeeNaira(creditNaira) {
    const kobo = Math.round((0, virtual_account_funds_1.roundNaira)(creditNaira) * 100);
    if (!Number.isSafeInteger(kobo) || kobo <= 0)
        return 0;
    const { data: profiles, error } = await supabase_1.supabaseAdmin
        .from('fee_profiles')
        .select('id')
        .eq('transaction_type', 'VIRTUAL_ACCOUNT_INWARD_TRANSFER')
        .limit(5);
    if (error || !profiles?.length)
        return 0;
    const { data: versions } = await supabase_1.supabaseAdmin
        .from('fee_profile_versions')
        .select('method, percentage_bps, flat_amount_kobo, min_fee_kobo, max_fee_kobo')
        .in('profile_id', profiles.map((row) => row.id))
        .eq('status', 'PUBLISHED')
        .limit(1);
    const version = versions?.[0];
    if (!version)
        return 0;
    const method = String(version.method || '');
    if (method !== 'FLAT' && method !== 'PERCENTAGE' && method !== 'HYBRID')
        return 0;
    try {
        const calc = FeeCalculator_1.FeeCalculator.calculate({
            method,
            transactionAmountKobo: kobo,
            percentageBps: Number(version.percentage_bps || 0),
            flatAmountKobo: Number(version.flat_amount_kobo || 0),
            minFeeKobo: Number(version.min_fee_kobo || 0),
            maxFeeKobo: Number(version.max_fee_kobo || 0),
        });
        return (0, virtual_account_funds_1.roundNaira)(Number(calc.final_fee_kobo || 0) / 100);
    }
    catch {
        return 0;
    }
}
/**
 * Takes the published inward charge off the school wallet after the gross
 * VA credit. Idempotent. Does not change the fee profile.
 */
async function deductVaInwardCharge(params) {
    const tenantId = String(params.tenantId || '').trim();
    const reference = String(params.reference || '').trim();
    const credit = (0, virtual_account_funds_1.roundNaira)(Number(params.amountNaira));
    if (!tenantId || !reference || !(credit > 0))
        return { status: 'skipped', deducted: 0 };
    const feeKey = `va-inward-fee:${reference}`;
    if (await ledger_service_1.LedgerService.exists(feeKey))
        return { status: 'already', deducted: 0 };
    if (!(await ledger_service_1.LedgerService.exists(`quasar:${reference}:credit`))) {
        return { status: 'no_credit', deducted: 0 };
    }
    const charge = vaInwardChargeNaira(credit, await publishedFeeNaira(credit));
    if (!(charge > 0))
        return { status: 'no_fee', deducted: 0 };
    await ledger_service_1.LedgerService.createDoubleEntry({
        idempotencyKey: feeKey,
        tenantId,
        reference: `charge-${reference}`,
        entries: [
            { account: 'USER_WALLET', type: 'DEBIT', amount: charge },
            { account: 'PLATFORM_FEE', type: 'CREDIT', amount: charge },
        ],
        actorId: 'SYSTEM_VA_FEE',
        provider: 'invify',
        metadata: { source: 'va_inward_fee', gross: credit, fee: charge },
    });
    try {
        const derived = await wallet_service_1.WalletService.getBalance(tenantId);
        await supabase_1.supabaseAdmin
            .from('wallets')
            .update({ balance: Number(derived?.balance || 0) })
            .eq('tenant_id', tenantId);
    }
    catch (err) {
        console.warn('[VaInwardCharge] wallet cache refresh skipped:', err?.message || err);
    }
    console.log(`[VaInwardCharge] deducted ${charge.toFixed(2)} refTail=${reference.slice(-6)}`);
    return { status: 'deducted', deducted: charge };
}
//# sourceMappingURL=va-inward-charge.service.js.map