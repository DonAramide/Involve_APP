import { Request, Response } from 'express';
import { walletService } from '../services/wallet.service';
import { supabase } from '../../../db/supabase';

export class WalletController {
  static async getWallet(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const data = await walletService.getWalletKPIs(authUserId);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getLedger(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const data = await walletService.getLedger(authUserId);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getCommissions(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const data = await walletService.getCommissions(authUserId);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async requestWithdrawal(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const data = await walletService.requestWithdrawal(authUserId, req.body);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      if (err?.code === 'INSUFFICIENT_AVAILABLE' || String(err.message || '').includes('INSUFFICIENT_AVAILABLE')) {
        return res.status(409).json({ success: false, code: 'INSUFFICIENT_AVAILABLE', message: err.message });
      }
      if (err?.code === 'PAYOUT_DISABLED' || String(err.message || '').includes('PAYOUT_DISABLED')) {
        return res.status(409).json({ success: false, code: 'PAYOUT_DISABLED', message: err.message });
      }
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async listWithdrawals(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const data = await walletService.getWithdrawals(authUserId);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async addBankAccount(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      // Simulate MFA confirmation
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password confirmation required' });
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: (req as any).user.email,
        password: password
      });
      if (error) {
        return res.status(401).json({ success: false, message: 'Invalid password' });
      }

      const data = await walletService.addBankAccount(authUserId, req.body);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getBankAccounts(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const data = await walletService.getBankAccounts(authUserId);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
