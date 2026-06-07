import { Request, Response } from 'express';
import { rbacService } from '../services/rbac.service';
export class RbacController {
  static async listRoles(req: Request, res: Response) {
    try { res.status(200).json({ success: true, data: await rbacService.listRoles() }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}
