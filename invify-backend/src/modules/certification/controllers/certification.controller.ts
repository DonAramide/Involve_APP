import { Request, Response } from 'express';
import { CertificationService } from '../services/certification.service';

const certificationService = new CertificationService();

export class CertificationController {
  async getCertifications(req: Request, res: Response) {
    try {
      // Could pass user ID if auth middleware sets it
      const agentId = req.query.agentId as string; 
      const certifications = await certificationService.getCertifications(agentId);
      res.json(certifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
