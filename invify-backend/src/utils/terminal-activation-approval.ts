export const TERMINAL_ACTIVATION_APPROVER = 'support@iips.app';

/** Only support@iips.app may approve, and not a request they made themselves. */
export function canApproveTerminalActivation(
  actorEmail: string,
  makerEmail: string,
): { ok: boolean; error?: string } {
  const actor = String(actorEmail || '').trim().toLowerCase();
  const maker = String(makerEmail || '').trim().toLowerCase();
  if (actor !== TERMINAL_ACTIVATION_APPROVER) {
    return { ok: false, error: 'Only support@iips.app can approve a terminal activation.' };
  }
  if (!maker || actor === maker) {
    return { ok: false, error: 'The person who requested this code cannot approve it.' };
  }
  return { ok: true };
}
