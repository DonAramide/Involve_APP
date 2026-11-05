import { Request, Response, NextFunction } from 'express';
/**
 * Requires a valid authenticator 2FA code for the signed-in admin.
 * Used for settlement uploads and all maker-checker approvals.
 */
export declare function requireAdminMfa(req: Request, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
/** Checker approve/reject must present a valid 2FA code. */
export declare const requireCheckerMfa: typeof requireAdminMfa;
