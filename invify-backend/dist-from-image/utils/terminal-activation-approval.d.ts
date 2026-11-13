export declare const TERMINAL_ACTIVATION_APPROVER = "support@iips.app";
/** Only support@iips.app may approve, and not a request they made themselves. */
export declare function canApproveTerminalActivation(actorEmail: string, makerEmail: string): {
    ok: boolean;
    error?: string;
};
