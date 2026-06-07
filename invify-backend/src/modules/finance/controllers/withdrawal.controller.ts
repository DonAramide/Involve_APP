import { Request, Response } from 'express';
export class WithdrawalController {
  static async request(req: Request, res: Response) {
    res.status(201).json({ success: true, message: 'Requested' });
  }
  static async patchStatus(req: Request, res: Response) {
    // Admin reviewing withdrawal
    res.status(200).json({ success: true, message: 'Status updated' });
  }
}
