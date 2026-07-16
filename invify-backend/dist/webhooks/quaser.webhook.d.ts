import { Request, Response } from 'express';
/**
 * POST /webhooks/quaser
 * The absolute source of truth for financial settlement.
 */
export declare const quaserWebhook: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
