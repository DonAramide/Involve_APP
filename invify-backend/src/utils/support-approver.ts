export const SUPPORT_APPROVER_EMAIL = 'support@iips.app';

/** Only support@iips.app may approve, and not a change they submitted. */
export function canApproveAsSupport(
  actorEmail: string,
  makerEmail: string,
): { ok: boolean; error?: string } {
  const actor = String(actorEmail || '').trim().toLowerCase();
  const maker = String(makerEmail || '').trim().toLowerCase();
  if (actor !== SUPPORT_APPROVER_EMAIL) {
    return { ok: false, error: 'Only support@iips.app can approve this change.' };
  }
  if (!maker || actor === maker) {
    return { ok: false, error: 'The person who submitted this change cannot approve it.' };
  }
  return { ok: true };
}
