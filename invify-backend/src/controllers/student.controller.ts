// invify-backend/src/controllers/student.controller.ts
import { Request, Response } from 'express';
import { StudentService } from '../services/student.service';

export class StudentController {
  /**
   * GET /api/finance/virtual-account/:studentId
   * Provisions or retrieves a student's virtual account.
   */
  static async getVirtualAccount(req: Request, res: Response) {
    try {
      const { studentId } = req.params;
      const tenantId = (req as any).user?.tenantId;

      if (!studentId) {
        return res.status(400).json({ error: "Student ID is required" });
      }

      if (!tenantId) {
        return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
      }

      const virtualAccount = await StudentService.getOrCreateVirtualAccount(studentId, tenantId);
      
      return res.status(200).json(virtualAccount);
    } catch (error: any) {
      console.error('[StudentController] getVirtualAccount Error:', error.message);
      return res.status(500).json({ error: "Failed to provision virtual account" });
    }
  }
}
