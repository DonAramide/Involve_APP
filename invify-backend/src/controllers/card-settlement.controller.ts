import { Request, Response } from 'express';
import multer from 'multer';
import { CardSettlementService } from '../services/settlement/card-settlement.service';
import { isSettlementTemplateType } from '../services/settlement/settlement-template.registry';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed =
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls') ||
      file.mimetype.includes('spreadsheet') ||
      file.mimetype.includes('excel');
    cb(null, allowed);
  },
});

export const cardSettlementUploadMiddleware = upload.single('file');

export class CardSettlementController {
  static async listTemplates(_req: Request, res: Response) {
    try {
      return res.status(200).json({ templates: CardSettlementService.listTemplates() });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async listBatches(req: Request, res: Response) {
    try {
      const tenantId =
        (req.query.tenantId as string) ||
        (req.headers['x-tenant-id'] as string) ||
        undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
      const batches = await CardSettlementService.listBatches({ tenantId, limit });
      return res.status(200).json({ batches });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getBatch(req: Request, res: Response) {
    try {
      const details = await CardSettlementService.getBatchDetails(req.params.id);
      return res.status(200).json(details);
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 500;
      return res.status(status).json({ error: error.message });
    }
  }

  static async uploadSettlementFile(req: Request, res: Response) {
    try {
      const file = req.file;
      if (!file?.buffer) {
        return res.status(400).json({ error: 'Settlement Excel file is required (field: file)' });
      }

      const templateType = String(req.body.templateType || '').trim();
      if (!isSettlementTemplateType(templateType)) {
        return res.status(400).json({
          error: 'Invalid templateType',
          allowed: CardSettlementService.listTemplates().map((t) => t.id),
        });
      }

      const dryRun =
        req.body.dryRun === true ||
        req.body.dryRun === 'true' ||
        req.query.dryRun === 'true';

      const user = (req as any).user;
      const tenantId = (req.body.tenantId as string) || (req.headers['x-tenant-id'] as string) || null;

      const result = await CardSettlementService.processUpload({
        buffer: file.buffer,
        fileName: file.originalname,
        templateType,
        tenantId,
        uploadedBy: { id: user.id, email: user.email },
        dryRun,
      });

      return res.status(200).json({
        success: true,
        message: dryRun
          ? 'Dry-run complete — no transactions were marked settled.'
          : 'Settlement file processed. Matched transactions marked as settled.',
        result,
      });
    } catch (error: any) {
      console.error('[CardSettlementController] upload error:', error.message);
      return res.status(400).json({ error: error.message });
    }
  }
}
