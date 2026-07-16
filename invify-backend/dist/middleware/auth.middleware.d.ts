import { Request, Response, NextFunction } from 'express';
/**
 * Middleware: Supabase JWT Verification
 * Extracts the token, verifies it with Supabase, and populates req.user.
 *
 * Security model:
 *  - All mock/bypass paths are gated by isMockTokenAllowed() or isMockAuthAllowed().
 *  - Both guards return false unconditionally in STAGING and PROD.
 *  - Connection timeouts return 503 — they do NOT grant bypass sessions in production.
 */
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
