import { Request, Response } from 'express';
import { profileService } from '../services/profile.service';
import { agentService } from '../services/agent.service';

export class ProfileController {
  static userFromReq(req: Request) {
    const user = (req as any).user || {};
    return { id: user.id, email: user.email };
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const { id: authUserId, email } = ProfileController.userFromReq(req);
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const profile = await profileService.getProfile(authUserId, email);
      res.status(200).json({ success: true, data: profile });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const { id: authUserId, email } = ProfileController.userFromReq(req);
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const updated = await profileService.updateProfile(authUserId, req.body, email);
      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async uploadPhoto(req: Request, res: Response) {
    try {
      const { id: authUserId, email } = ProfileController.userFromReq(req);
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      // In a real implementation this would upload to S3/Supabase Storage.
      // We simulate success and patch the profile:
      const simulatedUrl = `https://storage.invify.app/agents/photos/${authUserId}.png`;
      const updated = await profileService.updateProfile(authUserId, { photo_url: simulatedUrl }, email);
      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async uploadKyc(req: Request, res: Response) {
    try {
      const { id: authUserId, email } = ProfileController.userFromReq(req);
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const { type } = req.body; // PASSPORT, NIN, BVN, GOVT_ID, PROOF_OF_ADDRESS
      const simulatedUrl = `https://storage.invify.app/agents/kyc/${authUserId}_${type}.png`;
      const doc = await profileService.uploadKycDocument(authUserId, type, simulatedUrl, email);

      // If they uploaded BVN, we also save the masked BVN to their profile for easy retrieval
      if (type === 'BVN' && req.body.document_number) {
        const bvn = req.body.document_number;
        const masked = '***' + bvn.slice(-4);
        await profileService.updateProfile(authUserId, { bvn_masked: masked }, email);
      }

      res.status(200).json({ success: true, data: doc });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getKycDocuments(req: Request, res: Response) {
    try {
      const { id: authUserId, email } = ProfileController.userFromReq(req);
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const docs = await profileService.getKycDocuments(authUserId, email);
      res.status(200).json({ success: true, data: docs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getIdCard(req: Request, res: Response) {
    try {
      const { id: authUserId, email } = ProfileController.userFromReq(req);
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      
      const profile = await profileService.getProfile(authUserId, email);
      
      const idCardData = {
        name: profile.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        agentCode: profile.agent_code,
        email: profile.email,
        phone: profile.phone_number || profile.phone,
        territory: profile.territory || 'Unassigned',
        qrData: Buffer.from(`invify:agent:${profile.agent_code}`).toString('base64')
      };

      res.status(200).json({ success: true, data: idCardData });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getQrCode(req: Request, res: Response) {
    try {
      const { id: authUserId, email } = ProfileController.userFromReq(req);
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      
      const profile = await profileService.getProfile(authUserId, email);
      
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

  static async uploadLogo(req: Request, res: Response) {
    try {
      const { id: authUserId, email } = ProfileController.userFromReq(req);
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const base64Image = req.body?.logoImage || req.body?.image;
      if (!base64Image) {
        return res.status(400).json({ success: false, message: 'Base64 image data is required in logoImage' });
      }

      const agent = await profileService.findAgent(authUserId, email);
      const result = await agentService.updateLogo(
        agent.id,
        base64Image,
        authUserId,
        req.ip,
        req.headers['user-agent']
      );

      return res.status(200).json({
        success: true,
        message: 'Institution logo updated successfully',
        logoUrl: result.logoUrl,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async deleteLogo(req: Request, res: Response) {
    try {
      const { id: authUserId, email } = ProfileController.userFromReq(req);
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const agent = await profileService.findAgent(authUserId, email);
      await agentService.removeLogo(
        agent.id,
        authUserId,
        req.ip,
        req.headers['user-agent']
      );

      return res.status(200).json({
        success: true,
        message: 'Institution logo removed successfully',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
