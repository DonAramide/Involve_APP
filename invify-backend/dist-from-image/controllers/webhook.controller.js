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
exports.WebhookController = void 0;
const supabase_1 = require("../db/supabase");
const ledger_service_1 = require("../services/ledger.service");
const notification_service_1 = require("../services/notification.service");
const event_service_1 = require("../services/event.service");
const audit_service_1 = require("../services/audit.service");
const gateway_service_1 = require("../services/gateway.service");
const quasar_webhook_service_1 = require("../integrations/quasar/quasar-webhook.service");
const quasar_integration_store_1 = require("../integrations/quasar/quasar-integration.store");
const whatsapp_notification_service_1 = require("../services/whatsapp-notification.service");
const financial_dispute_service_1 = require("../services/financial-dispute.service");
const parent_va_routing_1 = require("../utils/parent-va-routing");
const wallet_service_1 = require("../services/wallet.service");
const school_fund_ownership_1 = require("../services/school-fund-ownership");
const virtual_account_ownership_1 = require("../services/virtual-account-ownership");
const virtual_account_funds_1 = require("../utils/virtual-account-funds");
const fee_shadow_integration_1 = require("../services/fee-shadow-integration");
const payout_reversal_service_1 = require("../services/payout-reversal.service");
const payment_alert_trail_service_1 = require("../services/payment-alert-trail.service");
const payout_status_service_1 = require("../services/payout-status.service");
function firstWebhookText(...values) {
    for (const value of values) {
        const text = String(value ?? '').trim();
        if (text)
            return text;
    }
    return '';
}
/** Quasar VA credits now include senderName and senderBankName. */
function vaSenderFromEvent(event) {
    const data = event?.data || {};
    const meta = data.metadata || event?.metadata || {};
    const sender = data.sender || meta.sender || {};
    const senderName = firstWebhookText(data.senderName, data.sender_name, meta.senderName, meta.sender_name, sender.name, sender.senderName) || 'Unknown Sender';
    const senderBank = firstWebhookText(data.senderBankName, data.sender_bank_name, meta.senderBankName, meta.sender_bank_name, data.senderBank, data.sender_bank, meta.senderBank, meta.sender_bank, sender.bankName, sender.senderBankName, data.bankName) || 'Unknown Bank';
    return { senderName, senderBank };
}
function isSandboxVaCredit(event) {
    return (event?.event === 'virtual_account.funded' ||
        event?.event === 'virtual_account.credit' ||
        event?.data?.mode === 'sandbox_credit' ||
        event?.data?.sandbox === true);
}
function resolveWebhookTimestamp(req, event) {
    const fromBody = Number(event?.timestamp);
    if (Number.isFinite(fromBody) && fromBody > 0) {
        return fromBody > 1e12 ? Math.floor(fromBody / 1000) : fromBody;
    }
    const fromHeader = Number(req.headers['x-quasar-timestamp']);
    if (!Number.isFinite(fromHeader) || fromHeader <= 0)
        return undefined;
    return fromHeader > 1e12 ? Math.floor(fromHeader / 1000) : fromHeader;
}
function resolveWebhookReference(req, event) {
    const fromData = event?.data?.reference || event?.data?.id || event?.data?.deliveryId;
    if (fromData)
        return String(fromData);
    const deliveryId = String(req.headers['x-quasar-delivery-id'] || '').trim();
    if (deliveryId)
        return `qfs:${deliveryId}`;
    const va = event?.data?.accountNumber || event?.data?.virtualAccountNumber;
    if (isSandboxVaCredit(event) && va) {
        const amount = event?.data?.amount ?? '';
        const stamp = event?.data?.id ||
            event?.timestamp ||
            req.headers['x-quasar-timestamp'] ||
            Date.now();
        const reason = String(event?.data?.reason || 'funded').trim().replace(/\s+/g, '_');
        // Include amount + stamp so two "Initial Wallet Funding" credits do not collapse.
        return `qfs:${va}:${reason}:${amount}:${stamp}`;
    }
    return null;
}
function pushQuasarWebhookEnvSecrets(pushSecret) {
    pushSecret(process.env.QUASAR_WEBHOOK_SIGNING_SECRET);
    pushSecret(process.env.QUASAR_WEBHOOK_SECRET);
    pushSecret(process.env.QUASAR_SANDBOX_WEBHOOK_SECRET);
}
/**
 * WebhookController is the CRITICAL entry point for financial state updates.
 * Rule: This is the ONLY place where student financial states (wallets/ledgers) are modified.
 */
class WebhookController {
    static async handleQuasarWebhook(req, res) {
        const signature = req.headers['x-quasar-signature'];
        const rawBuf = req.rawBody;
        const rawBody = Buffer.isBuffer(rawBuf)
            ? rawBuf.toString('utf8')
            : typeof rawBuf === 'string'
                ? rawBuf
                : JSON.stringify(req.body);
        const incomingLen = Buffer.isBuffer(rawBuf) ? rawBuf.length : Buffer.byteLength(rawBody || '', 'utf8');
        console.log(`[Webhook] POST ${req.originalUrl || req.url} bodyLength=${incomingLen} hasSignature=${Boolean(signature)} delivery=${req.headers['x-quasar-delivery-id'] || '-'} ip=${req.ip}`);
        if (!signature || !rawBody) {
            return res.status(400).json({ error: 'Security headers or body missing' });
        }
        try {
            const event = req.body;
            const webhookTimestamp = resolveWebhookTimestamp(req, event);
            const reference = resolveWebhookReference(req, event);
            const { amount, status } = event?.data || {};
            // Card notification webhooks (Quasar → Invify) — ack even if HTTP timed out on switch path
            if (typeof event?.event === 'string' &&
                event.event.startsWith('card.transaction.')) {
                return WebhookController._handleCardTransactionWebhook(req, res, event, signature, rawBody);
            }
            // Maker-checker dispute debit (refund / chargeback / manual debit)
            if (typeof event?.event === 'string' &&
                event.event.startsWith('dispute.debit.')) {
                return WebhookController._handleDisputeDebitWebhook(req, res, event, signature, rawBody);
            }
            // 1. RESOLVE TRANSACTION & TENANT (Never trust tenantId from payload)
            // QFS virtual_account.funded has no checkout reference — use delivery-id / VA.
            if (!reference) {
                return res.status(400).json({
                    error: isSandboxVaCredit(event)
                        ? 'Missing accountNumber or x-quasar-delivery-id for sandbox credit'
                        : 'Missing reference in payload',
                });
            }
            let resolvedTenantId = null;
            let resolvedWalletId = null;
            let resolvedCustomerId = null;
            let resolvedStudentId = null;
            let resolvedAdmissionNumber = null;
            let parentOwnedDeposit = false;
            let transaction = null;
            // Try finding the pre-existing checkout transaction by reference in transactions_log
            const { data: foundTx } = await supabase_1.supabaseAdmin
                .from('transactions_log')
                .select('tenant_id, wallet_id, status, type, amount, metadata')
                .eq('reference', reference)
                .maybeSingle();
            if (foundTx) {
                transaction = foundTx;
                resolvedTenantId = transaction.tenant_id;
                resolvedWalletId = transaction.wallet_id;
                const meta = (transaction.metadata || {});
                resolvedCustomerId = meta.customerId || meta.customer_id || null;
                resolvedStudentId = meta.studentId || meta.student_id || null;
                resolvedAdmissionNumber = meta.admissionNumber || meta.admission_number || null;
            }
            else {
                // Unsolicited credit (direct virtual account transfer)
                const virtualAccountNumber = event.data?.accountNumber || event.data?.virtualAccountNumber || event.data?.metadata?.virtualAccountNumber;
                if (virtualAccountNumber) {
                    // Resolve tenant-level virtual accounts first (provisioned via Quasar)
                    const { data: tenantRec } = await supabase_1.supabaseAdmin
                        .from('tenants')
                        .select('id')
                        .eq('virtual_account_number', virtualAccountNumber)
                        .maybeSingle();
                    if (tenantRec) {
                        resolvedTenantId = tenantRec.id;
                    }
                    else {
                        const { data: parentVaEntities } = await supabase_1.supabaseAdmin
                            .from('school_entities')
                            .select('tenant_id, payload')
                            .eq('entity_type', 'parent_virtual_account')
                            .filter('payload->>accountNumber', 'eq', String(virtualAccountNumber))
                            .limit(5);
                        let parentVa = (parentVaEntities || [])[0] || null;
                        if (!parentVa) {
                            const { data: parentEntities } = await supabase_1.supabaseAdmin
                                .from('school_entities')
                                .select('tenant_id, payload')
                                .eq('entity_type', 'parent')
                                .filter('payload->>virtualAccountNumber', 'eq', String(virtualAccountNumber))
                                .limit(5);
                            parentVa = (parentEntities || [])[0] || null;
                        }
                        const { data: custRows } = await supabase_1.supabaseAdmin
                            .from('customers')
                            .select('id, tenant_id, name')
                            .eq('virtual_account_number', virtualAccountNumber)
                            .limit(20);
                        const { data: studentRecs } = await supabase_1.supabaseAdmin
                            .from('students')
                            .select('id, school_id, tenant_id, admission_number, first_name, last_name')
                            .eq('virtual_account_number', virtualAccountNumber)
                            .limit(10);
                        const parentPayload = (parentVa?.payload || {});
                        const parentHintRaw = String(parentPayload.syncId || parentPayload.parentSyncId || parentVa?.tenant_id || '');
                        const parentCustomerIdHint = parentHintRaw
                            ? (parentHintRaw.startsWith('par-') ? parentHintRaw : `par-${parentHintRaw}`)
                            : null;
                        const attribution = (0, parent_va_routing_1.pickParentOwnedAttribution)({
                            customers: custRows || [],
                            students: studentRecs || [],
                            parentVaRegistered: Boolean(parentVa),
                            parentCustomerIdHint,
                        });
                        if (attribution.parentOwned) {
                            parentOwnedDeposit = true;
                            resolvedTenantId =
                                attribution.tenantId || parentVa?.tenant_id || (custRows || [])[0]?.tenant_id || null;
                            resolvedCustomerId = attribution.customerId;
                            resolvedStudentId = null;
                            resolvedAdmissionNumber = null;
                        }
                        else if ((custRows || []).length) {
                            resolvedTenantId = attribution.tenantId;
                            resolvedCustomerId = attribution.customerId;
                            resolvedStudentId = attribution.studentId;
                            resolvedAdmissionNumber = attribution.admissionNumber;
                        }
                        else {
                            const { data: staffUser } = await supabase_1.supabaseAdmin
                                .from('users')
                                .select('id, tenant_id')
                                .eq('virtual_account_number', virtualAccountNumber)
                                .maybeSingle();
                            if (staffUser?.tenant_id) {
                                resolvedTenantId = staffUser.tenant_id;
                            }
                            else if (studentRecs && studentRecs.length === 1) {
                                resolvedTenantId = attribution.tenantId;
                                resolvedCustomerId = attribution.customerId;
                                resolvedStudentId = attribution.studentId;
                                resolvedAdmissionNumber = attribution.admissionNumber;
                            }
                            else {
                                const { data: studentVa } = await supabase_1.supabaseAdmin
                                    .from('student_virtual_accounts')
                                    .select('student_id, school_id')
                                    .eq('account_number', virtualAccountNumber)
                                    .maybeSingle();
                                if (studentVa) {
                                    resolvedTenantId = studentVa.school_id;
                                    resolvedStudentId = studentVa.student_id;
                                }
                            }
                        }
                    }
                }
            }
            if ((0, parent_va_routing_1.isParentCustomerId)(resolvedCustomerId)) {
                parentOwnedDeposit = true;
                resolvedStudentId = null;
                resolvedAdmissionNumber = null;
            }
            if (!resolvedTenantId) {
                // Sandbox credits: Quasar VA numbers are not always mirrored in Invify yet
                if (event?.data?.sandbox === true && typeof event?.data?.tenantId === 'string') {
                    const quasarTenantId = event.data.tenantId;
                    // Map Quasar tenant → Invify tenant via integration store
                    try {
                        const mapped = await quasar_integration_store_1.QuasarIntegrationStore.getByQuasarTenantId(quasarTenantId);
                        if (mapped?.invify_tenant_id) {
                            resolvedTenantId = mapped.invify_tenant_id;
                            console.warn(`[Webhook] Sandbox credit mapped Quasar tenant ${quasarTenantId} → Invify ${resolvedTenantId}`);
                        }
                    }
                    catch {
                        /* continue fallback */
                    }
                    if (!resolvedTenantId) {
                        const { data: byId } = await supabase_1.supabaseAdmin
                            .from('tenants')
                            .select('id')
                            .eq('id', quasarTenantId)
                            .maybeSingle();
                        resolvedTenantId = byId?.id || null;
                        if (resolvedTenantId) {
                            console.warn(`[Webhook] Sandbox credit resolved tenant via payload tenantId=${resolvedTenantId} (VA may be Quasar-only)`);
                        }
                        else {
                            console.warn(`[Webhook] Sandbox payload tenantId=${quasarTenantId} is not an Invify tenant — cannot route socket notification`);
                        }
                    }
                }
            }
            if (!resolvedTenantId) {
                console.warn(`[Webhook] No transaction reference found and virtual account owner could not be resolved for reference: ${reference}. Acknowledging silently.`);
                return res.status(200).json({ received: true, note: 'unknown_context' });
            }
            // Check amount mismatch for pre-existing checkout payments
            if (transaction) {
                const expectedAmount = Number(transaction.amount);
                if (Math.round(amount) !== expectedAmount) {
                    console.error(`[Webhook] Amount mismatch for reference ${reference}. Expected: ${expectedAmount}, Received: ${Math.round(amount)}`);
                    return res.status(400).json({ error: 'Payment amount mismatch. Flagged for reconciliation.' });
                }
            }
            // 2. LOAD SIGNING SECRETS (tenant → env → Integration Vault PRODUCTION/SANDBOX)
            const integration = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(resolvedTenantId);
            const candidateSecrets = [];
            const pushSecret = (value) => {
                if (value && typeof value === 'string' && value.length >= 8 && !candidateSecrets.includes(value)) {
                    candidateSecrets.push(value);
                }
            };
            if (integration) {
                try {
                    pushSecret(quasar_integration_store_1.QuasarIntegrationStore.decryptSigningSecret(integration));
                }
                catch {
                    /* ignore decrypt failures */
                }
            }
            pushQuasarWebhookEnvSecrets(pushSecret);
            try {
                const { IntegrationVaultService } = await Promise.resolve().then(() => __importStar(require('../services/integration-vault.service')));
                for (const envName of ['PRODUCTION', 'SANDBOX']) {
                    pushSecret(await IntegrationVaultService.getDecryptedCredential('quasar', envName, undefined, 'QUASAR_WEBHOOK_SIGNING_SECRET'));
                }
            }
            catch {
                /* vault optional */
            }
            if (candidateSecrets.length === 0) {
                console.error('[Webhook] No Quasar webhook signing secret configured — failing closed');
                return res.status(503).json({
                    error: 'Webhook signing secret not configured',
                    code: 'WEBHOOK_SECRET_MISSING',
                });
            }
            else {
                console.log(`[Webhook] HMAC candidates loaded: ${candidateSecrets.length}`);
            }
            // Hydrate runtime env from first vault/tenant secret so subsequent requests stay warm
            if (!process.env.QUASAR_WEBHOOK_SIGNING_SECRET && candidateSecrets[0]) {
                process.env.QUASAR_WEBHOOK_SIGNING_SECRET = candidateSecrets[0];
                process.env.QUASAR_WEBHOOK_SECRET = candidateSecrets[0];
            }
            // 3. VERIFY SIGNATURE (HMAC-SHA256, constant-time, timestamp replay protection)
            let isValid = false;
            for (const secret of candidateSecrets) {
                if (quasar_webhook_service_1.QuasarWebhookService.verifySignature(rawBody, signature, secret, webhookTimestamp)) {
                    isValid = true;
                    break;
                }
            }
            // Sandbox / local clocks: retry without skew using the same secret pool (LOCAL/STAGING only)
            const variantService = require('../config/build-variant').BuildVariantService.getInstance();
            if (!isValid && event?.data?.sandbox === true && !variantService.isProd()) {
                for (const secret of candidateSecrets) {
                    if (quasar_webhook_service_1.QuasarWebhookService.verifySignature(rawBody, signature, secret, undefined)) {
                        isValid = true;
                        console.warn('[Webhook] Sandbox signature accepted with timestamp skew skipped.');
                        break;
                    }
                }
            }
            // Never accept unsigned webhooks — removed development HMAC-bypass that set isValid=true
            if (!isValid) {
                console.error('[Security] Webhook HMAC signature mismatch');
                return res.status(401).json({ error: 'Auth failure' });
            }
            // 4. LOG WEBHOOK RECEIVE
            await audit_service_1.AuditService.log({
                eventType: 'webhook.received',
                reference,
                tenantId: resolvedTenantId,
                payload: event
            });
            // 5. IDEMPOTENCY CHECK
            const idempotencyKey = `quasar:${reference}:credit`;
            const isPayoutRow = String(transaction?.type || '').toLowerCase() === 'payout';
            const envelopeId = String(event?.id || '').trim() || null;
            // Transfer payouts: SUCCESS/FAILED/REJECTED (case-insensitive) + envelope.id dedupe.
            // Approve in Quasar admin does not webhook; reject/fail and success do.
            if (isPayoutRow) {
                if (envelopeId && (await payout_status_service_1.PayoutStatusService.envelopeAlreadyProcessed(envelopeId))) {
                    return res.status(200).json({ status: 'already_processed', note: 'envelope' });
                }
                const outcome = (0, payout_status_service_1.resolveTransferOutcome)({
                    event: event?.event,
                    status: event?.data?.status ?? status,
                });
                if (outcome === 'success' || outcome === 'failed' || outcome === 'open') {
                    const applied = await payout_status_service_1.PayoutStatusService.applyOutcome({
                        tenantId: resolvedTenantId,
                        reference,
                        outcome,
                        quasarStatus: event?.data?.status,
                        reason: event?.data?.reason || event?.data?.message || null,
                        amount: event?.data?.amount ?? amount,
                        source: 'WEBHOOK',
                        envelopeId,
                    });
                    return res.status(200).json({
                        status: applied.applied ? 'processed' : 'already_processed',
                        payoutStatus: applied.status,
                        note: applied.note || null,
                    });
                }
                return res.status(200).json({ status: 'ignored', note: 'payout_non_terminal' });
            }
            if (await ledger_service_1.LedgerService.exists(idempotencyKey)) {
                console.log(`[Idempotency] Already processed ${reference}. Returning success.`);
                return res.status(200).json({ status: 'already_processed' });
            }
            // 6. PROCESS STATE UPDATES OR LOG DEPOSITS
            if (transaction) {
                const normalizedStatus = String(status || '').trim().toLowerCase();
                if (normalizedStatus === 'success' || event?.event === 'transfer.success') {
                    await WebhookController._handleSuccess(resolvedTenantId, resolvedWalletId, reference, amount, idempotencyKey, event, transaction.type, transaction.status);
                }
                else if (normalizedStatus === 'failed' || event?.event === 'transfer.failed') {
                    await WebhookController._handleFailure(resolvedTenantId, resolvedWalletId, reference, event, transaction.type, transaction.status);
                }
            }
            else {
                // Direct virtual account deposit
                if (status === 'success' ||
                    event.event === 'transfer.success' ||
                    event.event === 'virtual_account.credit' ||
                    event.event === 'virtual_account.funded') {
                    if (!resolvedWalletId) {
                        const { data: wallet } = await supabase_1.supabaseAdmin
                            .from('wallets')
                            .select('id')
                            .eq('tenant_id', resolvedTenantId)
                            .maybeSingle();
                        resolvedWalletId = wallet?.id;
                    }
                    const virtualAccountNumber = event.data?.accountNumber || event.data?.virtualAccountNumber || event.data?.metadata?.virtualAccountNumber;
                    const { senderName, senderBank } = vaSenderFromEvent(event);
                    const creditAmount = (0, virtual_account_funds_1.roundNaira)(Number(amount));
                    const isSandbox = event?.data?.sandbox === true;
                    const ownership = virtualAccountNumber
                        ? await (0, virtual_account_ownership_1.loadVirtualAccountKind)(String(virtualAccountNumber), { tenantId: resolvedTenantId })
                        : { kind: 'unknown', tenantId: resolvedTenantId };
                    if (ownership.kind === 'parent')
                        parentOwnedDeposit = true;
                    const schoolOwnedCredit = (0, virtual_account_ownership_1.creditsSchoolWallet)(ownership.kind) && !parentOwnedDeposit;
                    if (!Number.isFinite(creditAmount)) {
                        console.error(`[Webhook] Invalid amount for ${reference}:`, amount);
                        if (isSandbox) {
                            return res.status(200).json({ received: true, note: 'sandbox_invalid_amount' });
                        }
                        return res.status(400).json({ error: 'Invalid amount' });
                    }
                    try {
                        const depositEntries = parentOwnedDeposit
                            ? (0, school_fund_ownership_1.parentDepositLedgerEntries)(creditAmount)
                            : schoolOwnedCredit
                                ? [
                                    { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: creditAmount },
                                    { account: 'USER_WALLET', type: 'CREDIT', amount: creditAmount },
                                ]
                                : (0, school_fund_ownership_1.parentDepositLedgerEntries)(creditAmount);
                        if (!schoolOwnedCredit && !parentOwnedDeposit) {
                            console.warn(`[Webhook] Unknown virtual account ${virtualAccountNumber} for ${reference}; USER_WALLET was not credited.`);
                        }
                        if (resolvedWalletId && (schoolOwnedCredit || parentOwnedDeposit)) {
                            const posted = await ledger_service_1.LedgerService.createDoubleEntry({
                                idempotencyKey,
                                tenantId: resolvedTenantId,
                                reference,
                                entries: depositEntries,
                                actorId: 'SYSTEM_WEBHOOK',
                                provider: 'quasar',
                                metadata: {
                                    source: 'quasar_webhook',
                                    type: 'deposit',
                                    sandbox: isSandbox,
                                    paidVia: parentOwnedDeposit ? 'parent_account' : schoolOwnedCredit ? 'school_account' : 'unknown_account',
                                    schoolWalletCredit: schoolOwnedCredit,
                                },
                            });
                            if (posted?.status === 'DE-DUPLICATED' || posted?.data?.status === 'DE-DUPLICATED') {
                                return res.status(200).json({ status: 'already_processed' });
                            }
                            if (schoolOwnedCredit) {
                                await fee_shadow_integration_1.FeeShadowIntegration.afterVaInwardResult(true, {
                                    tenantId: resolvedTenantId,
                                    amountNaira: creditAmount,
                                    reference,
                                });
                                try {
                                    const derived = await wallet_service_1.WalletService.getBalance(resolvedTenantId);
                                    await supabase_1.supabaseAdmin
                                        .from('wallets')
                                        .update({ balance: Number(derived?.balance || 0) })
                                        .eq('id', resolvedWalletId);
                                }
                                catch (walletErr) {
                                    console.warn(`[Webhook] Wallet cache refresh failed for ${resolvedTenantId}:`, walletErr?.message || walletErr);
                                }
                            }
                        }
                        else {
                            console.warn(`[Webhook] No Invify wallet for tenant ${resolvedTenantId}; logged deposit without ledger for ${reference}`);
                        }
                        const { data: existingLog } = await supabase_1.supabaseAdmin
                            .from('transactions_log')
                            .select('id')
                            .eq('reference', reference)
                            .limit(1);
                        if (!existingLog?.length) {
                            const { error: insertErr } = await supabase_1.supabaseAdmin
                                .from('transactions_log')
                                .insert({
                                reference,
                                tenant_id: resolvedTenantId,
                                wallet_id: resolvedWalletId,
                                amount: creditAmount,
                                type: 'CREDIT',
                                provider: 'quasar',
                                status: 'SUCCESS',
                                metadata: {
                                    virtualAccountNumber,
                                    accountNumber: virtualAccountNumber,
                                    senderName,
                                    senderBank,
                                    sandbox: isSandbox,
                                    quasarEvent: event.event,
                                    amountNaira: creditAmount,
                                    amountRaw: amount,
                                    schoolWalletCredit: schoolOwnedCredit,
                                    ...(resolvedCustomerId ? { customerId: resolvedCustomerId } : {}),
                                    ...(resolvedStudentId ? { studentId: resolvedStudentId } : {}),
                                    ...(resolvedAdmissionNumber ? { admissionNumber: resolvedAdmissionNumber } : {}),
                                    ...(parentOwnedDeposit
                                        ? {
                                            paidVia: 'parent_account',
                                            ...(resolvedCustomerId ? { parentKey: resolvedCustomerId } : {}),
                                        }
                                        : {}),
                                }
                            });
                            if (insertErr && !String(insertErr.message || '').toLowerCase().includes('duplicate')) {
                                throw new Error(insertErr.message || 'transactions_log insert failed');
                            }
                        }
                        // Keep resending to this tenant until a device acknowledges the socket.
                        try {
                            const { io } = require('../app');
                            await payment_alert_trail_service_1.PaymentAlertTrailService.recordAndEmit(io, {
                                tenantId: resolvedTenantId,
                                reference,
                                amount: creditAmount,
                                payload: {
                                    walletId: resolvedWalletId,
                                    customerId: resolvedCustomerId,
                                    studentId: resolvedStudentId,
                                    metadata: {
                                        virtualAccountNumber,
                                        accountNumber: virtualAccountNumber,
                                        senderName,
                                        studentName: senderName,
                                        senderBank,
                                        sandbox: isSandbox,
                                        ...(resolvedCustomerId ? { customerId: resolvedCustomerId } : {}),
                                        ...(resolvedStudentId ? { studentId: resolvedStudentId } : {}),
                                        ...(resolvedAdmissionNumber ? { admissionNumber: resolvedAdmissionNumber } : {}),
                                        ...(parentOwnedDeposit
                                            ? {
                                                paidVia: 'parent_account',
                                                ...(resolvedCustomerId ? { parentKey: resolvedCustomerId } : {}),
                                            }
                                            : {}),
                                    },
                                },
                            });
                        }
                        catch (e) {
                            console.error('[PaymentAlert] Failed to record deposit alert:', e.message);
                        }
                        // Push / in-app notification path used by checkout success flow
                        try {
                            await notification_service_1.NotificationService.notifySchoolAdminOfPayment(resolvedTenantId, creditAmount, senderName);
                        }
                        catch (e) {
                            console.error('[NotificationService] Deposit notify failed:', e.message);
                        }
                        // WhatsApp receipt for depositor/customer (non-fatal)
                        try {
                            const depositMeta = event.data?.metadata || {};
                            whatsapp_notification_service_1.WhatsAppNotificationService.notifyReceipt({
                                tenantId: resolvedTenantId,
                                customerId: resolvedCustomerId || depositMeta.customerId || null,
                                receiptId: reference,
                                amount: creditAmount,
                                currency: event.data?.currency || 'NGN',
                                recipientPhone: depositMeta.customerPhone ||
                                    depositMeta.parentPhone ||
                                    depositMeta.phone ||
                                    null,
                                customerName: senderName,
                                reference,
                            });
                        }
                        catch (e) {
                            console.error('[WhatsAppNotification] Deposit receipt notify failed (non-fatal):', e?.message || e);
                        }
                        // Also emit via FinancialEventService so Supabase Realtime / watchGlobalEvents catches it and updates device dashboard / notifies
                        try {
                            await event_service_1.FinancialEventService.emit({
                                type: 'payment.success',
                                reference,
                                tenantId: resolvedTenantId,
                                walletId: resolvedWalletId || null,
                                amount: creditAmount,
                                metadata: {
                                    virtualAccountNumber,
                                    senderName,
                                    studentName: senderName, // Map to studentName for mobile display compatibility
                                    senderBank,
                                    sandbox: isSandbox,
                                    ...(resolvedCustomerId ? { customerId: resolvedCustomerId } : {}),
                                    ...(resolvedStudentId ? { studentId: resolvedStudentId } : {}),
                                    ...(resolvedAdmissionNumber ? { admissionNumber: resolvedAdmissionNumber } : {}),
                                    ...(parentOwnedDeposit
                                        ? {
                                            paidVia: 'parent_account',
                                            ...(resolvedCustomerId ? { parentKey: resolvedCustomerId } : {}),
                                        }
                                        : {}),
                                },
                                idempotencyKey: `event:deposit_success:${reference}`
                            });
                        }
                        catch (e) {
                            console.error('[EventService] Failed to emit deposit event:', e.message);
                        }
                    }
                    catch (procErr) {
                        if (isSandbox) {
                            console.error(`[Webhook] Sandbox deposit processing failed for ${reference}:`, procErr.message);
                            return res.status(200).json({
                                received: true,
                                note: 'sandbox_received_but_processing_failed',
                                error: procErr.message,
                            });
                        }
                        throw procErr;
                    }
                }
            }
            return res.status(200).json({ received: true });
        }
        catch (error) {
            console.error('[Webhook Critical Error]', error.message);
            try {
                await supabase_1.supabaseAdmin.from('webhook_dead_letters').insert({
                    provider: 'quasar',
                    endpoint: '/api/v1/webhooks/quasar',
                    payload: req.body,
                    error_message: error.message || String(error)
                });
                console.log(`[Webhook DLQ] Event stored in Dead Letter Queue for Quasar.`);
            }
            catch (dlqErr) {
                console.error('[DLQ Critical Failure] Could not store Quasar webhook in DLQ:', dlqErr.message);
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * POST /webhooks/paystack
     * Real Paystack webhook listener verifying HMAC SHA256 signatures.
     */
    static async handlePaystackWebhook(req, res) {
        const signature = req.headers['x-paystack-signature'];
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) {
            console.error('[Webhook] PAYSTACK_SECRET_KEY missing — failing closed');
            return res.status(503).json({ error: 'Webhook signing secret not configured', code: 'WEBHOOK_SECRET_MISSING' });
        }
        const rawBody = req.rawBody?.toString() || JSON.stringify(req.body);
        const isValid = gateway_service_1.PaymentGatewayConvergenceService.verifyWebhookHMAC(rawBody, signature, secret, "paystack");
        if (!isValid) {
            console.error('[Security] Paystack Webhook HMAC verification failed.');
            return res.status(401).json({ error: 'Signature mismatch' });
        }
        try {
            const result = await gateway_service_1.PaymentGatewayConvergenceService.processSettlementWebhook("paystack", signature, req.body);
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('[Paystack Webhook Error]', error.message);
            try {
                await supabase_1.supabaseAdmin.from('webhook_dead_letters').insert({
                    provider: 'paystack',
                    endpoint: '/api/v1/webhooks/paystack',
                    payload: req.body,
                    error_message: error.message || String(error)
                });
            }
            catch (dlqErr) {
                console.error('[DLQ Critical Failure]', dlqErr.message);
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * POST /webhooks/flutterwave
     * Real Flutterwave webhook listener.
     */
    static async handleFlutterwaveWebhook(req, res) {
        const signature = req.headers['verif-hash'];
        const secret = process.env.FLW_SECRET_HASH || process.env.FLW_SECRET_KEY;
        if (!secret) {
            console.error('[Webhook] FLW_SECRET_HASH/FLW_SECRET_KEY missing — failing closed');
            return res.status(503).json({ error: 'Webhook signing secret not configured', code: 'WEBHOOK_SECRET_MISSING' });
        }
        const isValid = gateway_service_1.PaymentGatewayConvergenceService.verifyWebhookHMAC("", signature, secret, "flutterwave");
        if (!isValid) {
            console.error('[Security] Flutterwave Webhook signature mismatch.');
            return res.status(401).json({ error: 'Signature mismatch' });
        }
        try {
            const result = await gateway_service_1.PaymentGatewayConvergenceService.processSettlementWebhook("flutterwave", signature, req.body);
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('[Flutterwave Webhook Error]', error.message);
            try {
                await supabase_1.supabaseAdmin.from('webhook_dead_letters').insert({
                    provider: 'flutterwave',
                    endpoint: '/api/v1/webhooks/flutterwave',
                    payload: req.body,
                    error_message: error.message || String(error)
                });
            }
            catch (dlqErr) {
                console.error('[DLQ Critical Failure]', dlqErr.message);
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * POST /webhooks/stripe
     * Real Stripe webhook listener verifying Stripe-Signature HMAC SHA256 header.
     */
    static async handleStripeWebhook(req, res) {
        const signature = req.headers['stripe-signature'];
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
            console.error('[Webhook] STRIPE_WEBHOOK_SECRET missing — failing closed');
            return res.status(503).json({ error: 'Webhook signing secret not configured', code: 'WEBHOOK_SECRET_MISSING' });
        }
        const rawBody = req.rawBody?.toString() || JSON.stringify(req.body);
        const isValid = gateway_service_1.PaymentGatewayConvergenceService.verifyWebhookHMAC(rawBody, signature, secret, "stripe");
        if (!isValid) {
            console.error('[Security] Stripe Webhook HMAC verification failed.');
            return res.status(401).json({ error: 'Signature mismatch' });
        }
        try {
            const result = await gateway_service_1.PaymentGatewayConvergenceService.processSettlementWebhook("stripe", signature, req.body);
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('[Stripe Webhook Error]', error.message);
            try {
                await supabase_1.supabaseAdmin.from('webhook_dead_letters').insert({
                    provider: 'stripe',
                    endpoint: '/api/v1/webhooks/stripe',
                    payload: req.body,
                    error_message: error.message || String(error)
                });
            }
            catch (dlqErr) {
                console.error('[DLQ Critical Failure]', dlqErr.message);
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Performs the double-entry write and updates transaction status.
     */
    static async _handleSuccess(tenantId, walletId, reference, amount, idempotencyKey, event, type = 'payment', priorStatus) {
        console.log(`[Webhook] Processing success for ${type} ref: ${reference}`);
        if (type === 'payout') {
            // Wallet was debited (USER_WALLET → EXTERNAL_BANK) at initiation; success moves no money.
            if (String(priorStatus || '').toUpperCase() === 'SUCCESS') {
                console.log(`[Webhook] Payout ${reference} already SUCCESS. Skipping.`);
                return;
            }
            const verdict = await payout_reversal_service_1.PayoutReversalService.settlementState(tenantId, reference);
            if (verdict !== 'RESERVED') {
                console.error(`[Webhook] Payout success for ${reference} needs reconciliation: ${verdict}`);
                await audit_service_1.AuditService.log({
                    eventType: 'payout.reconciliation_required',
                    reference,
                    tenantId,
                    payload: { reason: verdict, webhook_status: 'success', amount, event_data: event.data },
                });
                return;
            }
        }
        else {
            await ledger_service_1.LedgerService.createDoubleEntry({
                idempotencyKey,
                tenantId,
                reference,
                entries: [
                    { account: 'QUASAR_CLEARING', type: 'DEBIT', amount },
                    { account: 'USER_WALLET', type: 'CREDIT', amount },
                ],
                actorId: 'SYSTEM_WEBHOOK',
                provider: 'quasar',
                metadata: { source: 'quasar_webhook', type }
            });
        }
        const vaEvent = event?.event === 'virtual_account.credit' ||
            event?.event === 'virtual_account.funded' ||
            type === 'CREDIT' ||
            type === 'DEPOSIT' ||
            type === 'INWARD' ||
            type === 'INWARD_PAYMENT' ||
            type === 'VIRTUAL_ACCOUNT_CREDIT';
        if (type !== 'payout' && vaEvent) {
            await fee_shadow_integration_1.FeeShadowIntegration.afterVaInwardResult(true, {
                tenantId,
                amountNaira: Number(amount),
                reference,
            });
        }
        // 2. Update Transaction Status → SUCCESS
        await supabase_1.supabaseAdmin
            .from('transactions_log')
            .update({ status: 'SUCCESS', processed_at: new Date().toISOString() })
            .eq('reference', reference);
        // 3. Emit Financial Event for Realtime UI update
        await event_service_1.FinancialEventService.emit({
            type: type === 'payout' ? 'payout.success' : 'payment.success',
            reference,
            tenantId,
            walletId,
            amount,
            metadata: event.data?.metadata || {},
            idempotencyKey: `event:${type === 'payout' ? 'payout' : 'payment'}_success:${reference}`
        });
        // 4. Emit Push Notification to School Admin
        if (type === 'payout') {
            await notification_service_1.NotificationService.notifySchoolAdminOfPayoutSuccess(tenantId, amount);
        }
        else {
            const studentName = event.data?.metadata?.studentName || 'Student';
            await notification_service_1.NotificationService.notifySchoolAdminOfPayment(tenantId, amount, studentName);
            // Customer/parent WhatsApp receipt (non-fatal; does not affect ledger)
            try {
                const meta = event.data?.metadata || {};
                const recipientPhone = meta.customerPhone ||
                    meta.parentPhone ||
                    meta.phone ||
                    meta.whatsapp ||
                    null;
                whatsapp_notification_service_1.WhatsAppNotificationService.notifyReceipt({
                    tenantId,
                    customerId: meta.customerId || null,
                    invoiceId: meta.invoiceId || null,
                    receiptId: reference,
                    amount,
                    currency: event.data?.currency || 'NGN',
                    recipientPhone,
                    customerName: meta.studentName || meta.customerName || studentName,
                    reference,
                });
            }
            catch (e) {
                console.error('[WhatsAppNotification] Payment receipt notify failed (non-fatal):', e?.message || e);
            }
        }
        // 5. IMMUTABLE AUDIT LOG
        await audit_service_1.AuditService.log({
            eventType: (type === 'payout' ? 'payout.success' : 'payment.success'),
            reference,
            tenantId,
            payload: { amount, type, event_data: event.data }
        });
        // 6. Credits stay on the alert trail until a device acknowledges the socket.
        // Payouts remain a single socket emit.
        try {
            const { io } = require('../app');
            if (type === 'payout') {
                if (io) {
                    io.to(`tenant:${tenantId}`).emit('payment.success', {
                        type: 'payout.success',
                        reference,
                        tenantId,
                        walletId,
                        amount,
                        metadata: event.data?.metadata || {},
                    });
                }
            }
            else {
                await payment_alert_trail_service_1.PaymentAlertTrailService.recordAndEmit(io, {
                    tenantId,
                    reference,
                    amount,
                    payload: {
                        walletId,
                        metadata: event.data?.metadata || {},
                    },
                });
            }
        }
        catch (e) {
            console.error('[PaymentAlert] Failed to emit payment alert:', e.message);
        }
        console.log(`[Event] Emit payment.success for ${reference}`);
    }
    /**
     * Updates transaction status to FAILED.
     */
    static async _handleFailure(tenantId, walletId, reference, event, type = 'payment', priorStatus) {
        console.log(`[Webhook] Processing failure for ${type} ref: ${reference}`);
        const prior = String(priorStatus || '').toUpperCase();
        if (type === 'payout') {
            if (prior === 'SUCCESS') {
                // Restoring funds after a confirmed success could create money; route to a human.
                console.error(`[Webhook] Payout ${reference} failed after SUCCESS — reconciliation required.`);
                await audit_service_1.AuditService.log({
                    eventType: 'payout.reconciliation_required',
                    reference,
                    tenantId,
                    payload: { reason: 'FAILED_AFTER_SUCCESS', event_data: event.data },
                });
                return;
            }
            // Idempotent: deterministic key, amount taken from the original debit.
            // Runs even on a repeated FAILED webhook so a crash between status update and reversal self-heals.
            await payout_reversal_service_1.PayoutReversalService.reverseFailedPayout({
                tenantId,
                reference,
                reason: String(event?.data?.reason || event?.data?.message || event?.event || 'payout.failed'),
                source: 'WEBHOOK_PAYOUT_FAILED',
            });
            if (prior === 'FAILED') {
                console.log(`[Webhook] Payout ${reference} already FAILED. Reversal ensured; skipping notifications.`);
                return;
            }
        }
        await supabase_1.supabaseAdmin
            .from('transactions_log')
            .update({ status: 'FAILED', processed_at: new Date().toISOString() })
            .eq('reference', reference);
        // Emit Financial Event
        await event_service_1.FinancialEventService.emit({
            type: type === 'payout' ? 'payout.failed' : 'payment.failed',
            reference,
            tenantId,
            walletId,
            amount: event.data?.amount || 0,
            idempotencyKey: `event:${type === 'payout' ? 'payout' : 'payment'}_failed:${reference}`
        });
        if (type === 'payout') {
            await notification_service_1.NotificationService.notifySchoolAdminOfPayoutFailure(tenantId, event.data?.amount || 0);
        }
        // IMMUTABLE AUDIT LOG
        await audit_service_1.AuditService.log({
            eventType: (type === 'payout' ? 'payout.failed' : 'payment.failed'),
            reference,
            tenantId,
            payload: { ...event, type }
        });
        console.log(`[Event] Emit payment.failed for ${reference}`);
    }
    static async _verifyQuasarWebhookSignature(event, signature, rawBody, resolvedTenantId) {
        const candidateSecrets = [];
        const pushSecret = (value) => {
            if (value && typeof value === 'string' && value.length >= 8 && !candidateSecrets.includes(value)) {
                candidateSecrets.push(value);
            }
        };
        if (resolvedTenantId) {
            try {
                const integration = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(resolvedTenantId);
                if (integration)
                    pushSecret(quasar_integration_store_1.QuasarIntegrationStore.decryptSigningSecret(integration));
            }
            catch {
                /* ignore */
            }
        }
        pushQuasarWebhookEnvSecrets(pushSecret);
        for (const secret of candidateSecrets) {
            if (quasar_webhook_service_1.QuasarWebhookService.verifySignature(rawBody, signature, secret, event?.timestamp))
                return true;
            if (quasar_webhook_service_1.QuasarWebhookService.verifySignature(rawBody, signature, secret, undefined))
                return true;
        }
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[Webhook] Dispute HMAC mismatch — accepting in development');
            return true;
        }
        return false;
    }
    /**
     * Quasar dispute debit notifications — complete maker-checker cases left APPROVED_EXECUTING
     * after a sync timeout. Never credits wallets; completePosted debits USER_WALLET fail-closed.
     */
    static async _handleDisputeDebitWebhook(req, res, event, signature, rawBody) {
        const caseId = event?.data?.invifyCaseId || event?.data?.invify_case_id || event?.data?.metadata?.invifyCaseId;
        let resolvedTenantId = null;
        if (caseId) {
            try {
                const row = await financial_dispute_service_1.FinancialDisputeService.getById(String(caseId));
                resolvedTenantId = row.tenant_id;
            }
            catch {
                /* fall through */
            }
        }
        if (!resolvedTenantId && event?.data?.tenantId) {
            try {
                const mapped = await quasar_integration_store_1.QuasarIntegrationStore.getByQuasarTenantId(String(event.data.tenantId));
                resolvedTenantId = mapped?.invify_tenant_id || null;
            }
            catch {
                /* ignore */
            }
        }
        const isValid = await WebhookController._verifyQuasarWebhookSignature(event, signature, rawBody, resolvedTenantId);
        if (!isValid) {
            return res.status(401).json({ error: 'Auth failure' });
        }
        try {
            const result = await financial_dispute_service_1.FinancialDisputeService.applyQuasarWebhook(event);
            if (resolvedTenantId) {
                await audit_service_1.AuditService.log({
                    eventType: 'webhook.received',
                    reference: String(caseId || event?.data?.id || 'dispute-debit'),
                    tenantId: resolvedTenantId,
                    payload: event,
                });
            }
            return res.status(200).json({ received: true, event: event.event, result });
        }
        catch (err) {
            console.error('[Webhook] dispute.debit handler:', err.message);
            return res.status(200).json({
                received: true,
                event: event.event,
                note: err.message,
                case: err.case || undefined,
            });
        }
    }
    /**
     * Quasar card rail notifications — do not credit wallets.
     * Used so Invify still learns ISO/KIMONO/MPOS outcomes when the sync HTTP call timed out.
     * Updates the tenant POS attempt (idempotent by data.reference / RRN+STAN).
     */
    static async _handleCardTransactionWebhook(req, res, event, signature, rawBody) {
        const reference = event?.data?.reference;
        const quasarTenantId = typeof event?.data?.tenantId === 'string' ? event.data.tenantId : null;
        if (!reference) {
            return res.status(400).json({ error: 'Missing reference in card payload' });
        }
        let resolvedTenantId = null;
        if (quasarTenantId) {
            try {
                const mapped = await quasar_integration_store_1.QuasarIntegrationStore.getByQuasarTenantId(quasarTenantId);
                if (mapped?.invify_tenant_id) {
                    resolvedTenantId = mapped.invify_tenant_id;
                }
            }
            catch {
                /* fall through */
            }
            if (!resolvedTenantId) {
                const { data: byId } = await supabase_1.supabaseAdmin
                    .from('tenants')
                    .select('id')
                    .eq('id', quasarTenantId)
                    .maybeSingle();
                resolvedTenantId = byId?.id || null;
            }
        }
        if (!resolvedTenantId) {
            console.warn(`[Webhook] card event ${event.event} ref=${reference} — tenant unresolved; acknowledging`);
            return res.status(200).json({ received: true, note: 'card_unknown_tenant' });
        }
        const integration = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(resolvedTenantId);
        const candidateSecrets = [];
        const pushSecret = (value) => {
            if (value && typeof value === 'string' && value.length >= 8 && !candidateSecrets.includes(value)) {
                candidateSecrets.push(value);
            }
        };
        if (integration) {
            try {
                pushSecret(quasar_integration_store_1.QuasarIntegrationStore.decryptSigningSecret(integration));
            }
            catch {
                /* ignore */
            }
        }
        pushQuasarWebhookEnvSecrets(pushSecret);
        let isValid = false;
        for (const secret of candidateSecrets) {
            if (quasar_webhook_service_1.QuasarWebhookService.verifySignature(rawBody, signature, secret, event?.timestamp)) {
                isValid = true;
                break;
            }
            if (quasar_webhook_service_1.QuasarWebhookService.verifySignature(rawBody, signature, secret, undefined)) {
                isValid = true;
                break;
            }
        }
        if (!isValid && process.env.NODE_ENV !== 'production') {
            console.warn('[Webhook] Card HMAC mismatch — accepting in development');
            isValid = true;
        }
        if (!isValid) {
            return res.status(401).json({ error: 'Auth failure' });
        }
        await audit_service_1.AuditService.log({
            eventType: 'webhook.received',
            reference,
            tenantId: resolvedTenantId,
            payload: event,
        });
        let applyResult = null;
        try {
            const { PosService } = await Promise.resolve().then(() => __importStar(require('../services/pos.service')));
            applyResult = await PosService.applyCardWebhookUpdate({
                tenantId: resolvedTenantId,
                event: event.event,
                data: event.data || {},
            });
        }
        catch (e) {
            console.error(`[Webhook] Failed to apply card txn update for ${reference}:`, e.message);
            return res.status(500).json({ error: 'Failed to update card transaction', reference });
        }
        try {
            const { io } = require('../app');
            if (io) {
                io.to(`tenant:${resolvedTenantId}`).emit('card.transaction', {
                    type: event.event,
                    reference,
                    tenantId: resolvedTenantId,
                    approved: event.data?.approved === true,
                    status: event.data?.status,
                    outcome: event.data?.outcome,
                    mode: event.data?.mode,
                    amount: event.data?.amount,
                    rrn: event.data?.rrn,
                    stan: event.data?.stan,
                    terminalId: event.data?.terminalId,
                    attemptId: applyResult?.attemptId,
                    localStatus: applyResult?.status,
                    duplicate: applyResult?.duplicate === true,
                });
            }
        }
        catch (e) {
            console.error('[Socket.io] Failed to emit card.transaction:', e.message);
        }
        console.log(`[Webhook] Card ${event.event} ack tenant=${resolvedTenantId} ref=${reference} ` +
            `approved=${event.data?.approved} attempt=${applyResult?.attemptId} ` +
            `dup=${applyResult?.duplicate} created=${applyResult?.created} status=${applyResult?.status}`);
        return res.status(200).json({
            received: true,
            event: event.event,
            reference,
            attemptId: applyResult?.attemptId,
            status: applyResult?.status,
            duplicate: applyResult?.duplicate === true,
            created: applyResult?.created === true,
            updated: applyResult?.updated === true,
        });
    }
}
exports.WebhookController = WebhookController;
//# sourceMappingURL=webhook.controller.js.map