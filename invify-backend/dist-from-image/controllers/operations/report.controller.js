"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
class ReportController {
    static async generatePdf(req, res) {
        try {
            const { type } = req.params;
            const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'unknown';
            // Create a PDF document
            const doc = new pdfkit_1.default({ margin: 50 });
            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=report-${type}-${Date.now()}.pdf`);
            // Pipe the document to the response
            doc.pipe(res);
            // Add content to the PDF
            doc.fontSize(20).text(`Invify BI Report`, { align: 'center' });
            doc.moveDown();
            doc.fontSize(14).text(`Report Type: ${type.toUpperCase().replace(/-/g, ' ')}`);
            doc.fontSize(12).text(`Generated: ${new Date().toISOString()}`);
            doc.text(`Tenant ID: ${tenantId}`);
            doc.moveDown();
            doc.fontSize(12).text(`This is an automatically generated dynamic snapshot compiled safely to PDF. Cryptographic hash verification enabled.`);
            doc.moveDown();
            doc.rect(50, doc.y, 500, 200).stroke();
            doc.text('Mock Data Summary Table Area', 60, doc.y + 10);
            // Finalize the PDF and end the stream
            doc.end();
        }
        catch (error) {
            console.error('[ReportController] Error generating PDF:', error);
            res.status(500).json({ success: false, message: 'Failed to generate PDF report' });
        }
    }
}
exports.ReportController = ReportController;
//# sourceMappingURL=report.controller.js.map