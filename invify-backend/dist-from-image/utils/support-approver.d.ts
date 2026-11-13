export declare const SUPPORT_APPROVER_EMAIL = "support@iips.app";
/** Only support@iips.app may approve, and not a change they submitted. */
export declare function canApproveAsSupport(actorEmail: string, makerEmail: string): {
    ok: boolean;
    error?: string;
};
