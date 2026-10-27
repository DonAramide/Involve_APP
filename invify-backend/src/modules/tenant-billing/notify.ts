import { NotificationService } from '../../services/notification.service';
import { TenantAlertService } from '../../services/tenant-alert.service';

export type BillingPaymentStage = 'submitted' | 'posted' | 'rejected';

function nairaLabel(amountNaira: string): string {
  const n = Number(String(amountNaira || '').replace(/,/g, ''));
  if (!Number.isFinite(n)) return String(amountNaira || '');
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function notifyTenantBillingPayment(input: {
  tenantId: string;
  stage: BillingPaymentStage;
  amountLabel?: string;
  amountKobo?: number;
  reference?: string;
}): Promise<void> {
  const tenantId = String(input.tenantId || '').trim();
  if (!tenantId) return;
  const amount =
    input.amountLabel ||
    nairaLabel(input.amountKobo != null ? String(Number(input.amountKobo) / 100) : '');
  const ref = input.reference ? ` (ref ${input.reference})` : '';
  const copy: Record<BillingPaymentStage, { title: string; body: string }> = {
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
    await TenantAlertService.notify(tenantId, 'transaction', msg);
    const people = await TenantAlertService.recipients(tenantId);
    await Promise.allSettled(
      people
        .filter((p) => p.userId)
        .map((p) =>
          NotificationService.sendToUser(p.userId as string, msg.title, msg.body, {
            type: `billing.payment.${input.stage}`,
            tenantId,
          }),
        ),
    );
  } catch (e: any) {
    console.warn('[tenant-billing] tenant notify failed:', e?.message || e);
  }
}
