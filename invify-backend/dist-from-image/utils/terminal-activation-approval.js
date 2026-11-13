"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TERMINAL_ACTIVATION_APPROVER = void 0;
exports.canApproveTerminalActivation = canApproveTerminalActivation;
exports.TERMINAL_ACTIVATION_APPROVER = 'support@iips.app';
/** Only support@iips.app may approve, and not a request they made themselves. */
function canApproveTerminalActivation(actorEmail, makerEmail) {
    const actor = String(actorEmail || '').trim().toLowerCase();
    const maker = String(makerEmail || '').trim().toLowerCase();
    if (actor !== exports.TERMINAL_ACTIVATION_APPROVER) {
        return { ok: false, error: 'Only support@iips.app can approve a terminal activation.' };
    }
    if (!maker || actor === maker) {
        return { ok: false, error: 'The person who requested this code cannot approve it.' };
    }
    return { ok: true };
}
//# sourceMappingURL=terminal-activation-approval.js.map