import { Request, Response } from 'express';
import { profileService } from '../services/profile.service';

export class ProfileController {
  static async getProfile(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const profile = await profileService.getProfile(authUserId);
      res.status(200).json({ success: true, data: profile });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const updated = await profileService.updateProfile(authUserId, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async uploadPhoto(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      // In a real implementation this would upload to S3/Supabase Storage.
      // We simulate success and patch the profile:
      const simulatedUrl = `https://storage.invify.app/agents/photos/${authUserId}.png`;
      const updated = await profileService.updateProfile(authUserId, { photo_url: simulatedUrl });
      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async uploadKyc(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const { type } = req.body; // PASSPORT, NIN, BVN, GOVT_ID, PROOF_OF_ADDRESS
      const simulatedUrl = `https://storage.invify.app/agents/kyc/${authUserId}_${type}.png`;
      const doc = await profileService.uploadKycDocument(authUserId, type, simulatedUrl);

      // If they uploaded BVN, we also save the masked BVN to their profile for easy retrieval
      if (type === 'BVN' && req.body.document_number) {
        const bvn = req.body.document_number;
        const masked = '***' + bvn.slice(-4);
        await profileService.updateProfile(authUserId, { bvn_masked: masked });
      }

      res.status(200).json({ success: true, data: doc });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getKycDocuments(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const docs = await profileService.getKycDocuments(authUserId);
      res.status(200).json({ success: true, data: docs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getQrCode(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      
      const profile = await profileService.getProfile(authUserId);
      
      const qrData = {
        uuid: profile.id,
        code: profile.agent_code,
        url: `https://verify.invify.app/agent/${profile.agent_code}`
      };
      res.status(200).json({ success: true, data: qrData });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}