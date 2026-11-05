"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardSettlementController = exports.cardSettlementUploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const card_settlement_service_1 = require("../services/settlement/card-settlement.service");
const settlement_template_registry_1 = require("../services/settlement/settlement-template.registry");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = file.originalname.endsWith('.xlsx') ||
            file.originalname.endsWith('.xls') ||
            file.mimetype.includes('spreadsheet') ||
            file.mimetype.includes('excel');
        cb(null, allowed);
    },
});
exports.cardSettlementUploadMiddleware = upload.single('file');
class CardSettlementController {
    static async listTemplates(_req, res) {
        try {
            return res.status(200).json({ templates: card_settlement_service_1.CardSettlementService.listTemplates() });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async listBatches(req, res) {
        try {
            const tenantId = req.query.tenantId ||
                req.headers['x-tenant-id'] ||
                undefined;
            const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
            const batches = await card_settlement_service_1.CardSettlementService.listBatches({ tenantId, limit });
            return res.status(200).json({ batches });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getBatch(req, res) {
        try {
            const details = await card_settlement_service_1.CardSettlementService.getBatchDetails(req.params.id);
            return res.status(200).json(details);
        }
        catch (error) {
            const status = error.message.includes('not found') ? 404 : 500;
            return res.status(status).json({ error: error.message });
        }
    }
    static async uploadSettlementFile(req, res) {
        try {
            const file = req.file;
            if (!file?.buffer) {
                return res.status(400).json({ error: 'Settlement Excel file is required (field: file)' });
            }
            const templateType = String(req.body.templateType || '').trim();
            if (!(0, settlement_template_registry_1.isSettlementTemplateType)(templateType)) {
                return res.status(400).json({
                    error: 'Invalid templateType',
                    allowed: card_settlement_service_1.CardSettlementService.listTemplates().map((t) => t.id),
                });
            }
            const dryRun = req.body.dryRun === true ||
                req.body.dryRun === 'true' ||
                req.query.dryRun === 'true';
            const user = req.user;
            const tenantId = req.body.tenantId || req.headers['x-tenant-id'] || null;
            const result = await card_settlement_service_1.CardSettlementService.processUpload({
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
        }
        catch (error) {
            console.error('[CardSettlementController] upload error:', error.message);
            return res.status(400).json({ error: error.message });
        }
    }
}
exports.CardSettlementController = CardSettlementController;
//# sourceMappingURL=card-settlement.controller.js.map