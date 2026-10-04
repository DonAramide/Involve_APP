import { Request, Response } from 'express';
import { MakerCheckerService, makerCheckerPublicView } from '../services/maker-checker.service';

function actorEmail(req: Request): string {
  return String((req as any).user?.email || '').trim().toLowerCase();
}

function isPlatform(req: Request): boolean {
  const role = String((req as any).user?.role || '').toLowerCase();
  return (
    role === 'super_admin' ||
    role === 'internal_staff' ||
    role === 'admin' ||
    role.startsWith('admin_')
  );
}

export class MakerCheckerController {
  static async list(req: Request, res: Response) {
    try {
      const domain = String(req.query.domain || '').trim();
      const tenantId = (req as any).user?.tenantId || (req as any).user?.tenant_id || null;
      const userId = String((req as any).user?.id || '');
      const rows = MakerCheckerService.list(domain || undefined).filter((row) => {
        if (isPlatform(req)) return true;
        return row.maker.tenantId === tenantId || row.maker.id === userId;
      });
      return res.status(200).json(rows.map(makerCheckerPublicView));
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Could not load approvals.' });
    }
  }

  static async approve(req: Request, res: Response) {
    try {
      const result = await MakerCheckerService.approve(String(req.params.id || ''), actorEmail(req));
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(error.status || 400).json({ error: error.message || 'Approval failed.' });
    }
  }

  static async reject(req: Request, res: Response) {
    try {
      const result = MakerCheckerService.reject(String(req.params.id || ''), actorEmail(req));
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(error.status || 400).json({ error: error.message || 'Rejection failed.' });
    }
  }
}
