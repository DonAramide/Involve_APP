"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORT_APPROVER_EMAIL = void 0;
exports.canApproveAsSupport = canApproveAsSupport;
exports.SUPPORT_APPROVER_EMAIL = 'support@iips.app';
/** Only support@iips.app may approve, and not a change they submitted. */
function canApproveAsSupport(actorEmail, makerEmail) {
    const actor = String(actorEmail || '').trim().toLowerCase();
    const maker = String(makerEmail || '').trim().toLowerCase();
    if (actor !== exports.SUPPORT_APPROVER_EMAIL) {
        return { ok: false, error: 'Only support@iips.app can approve this change.' };
    }
    if (!maker || actor === maker) {
        return { ok: false, error: 'The person who submitted this change cannot approve it.' };
    }
    return { ok: true };
}
//# sourceMappingURL=support-approver.js.map