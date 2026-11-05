"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyTenantBillingPayment = notifyTenantBillingPayment;
const notification_service_1 = require("../../services/notification.service");
const tenant_alert_service_1 = require("../../services/tenant-alert.service");
function nairaLabel(amountNaira) {
    const n = Number(String(amountNaira || '').replace(/,/g, ''));
    if (!Number.isFinite(n))
        return String(amountNaira || '');
    return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
async function notifyTenantBillingPayment(input) {
    const tenantId = String(input.tenantId || '').trim();
    if (!tenantId)
        return;
    const amount = input.amountLabel ||
        nairaLabel(input.amountKobo != null ? String(Number(input.amountKobo) / 100) : '');
    const ref = input.reference ? ` (ref ${input.reference})` : '';
    const copy = {
        submitted: {
            title: 'Payment submitted for approval',
            body: `A collection of ${amount} has been submitted and is waiting for Invify checker approval${ref}.`,
        },
        posted: {
            title: 'Payment posted to your account',
            body: `A collection of ${amount} has been posted to your Invify billing account${ref}. Outstanding balances will update accordingly.`,
        },
        rejected: {
            title: 'Payment posting was not approved',
            body: `A collection of ${amount} was rejected by the checker and was not applied${ref}.`,
        },
    };
    const msg = copy[input.stage];
    try {
        await tenant_alert_service_1.TenantAlertService.notify(tenantId, 'transaction', msg);
        const people = await tenant_alert_service_1.TenantAlertService.recipients(tenantId);
        await Promise.allSettled(people
            .filter((p) => p.userId)
            .map((p) => notification_service_1.NotificationService.sendToUser(p.userId, msg.title, msg.body, {
            type: `billing.payment.${input.stage}`,
            tenantId,
        })));
    }
    catch (e) {
        console.warn('[tenant-billing] tenant notify failed:', e?.message || e);
    }
}
//# sourceMappingURL=notify.js.map