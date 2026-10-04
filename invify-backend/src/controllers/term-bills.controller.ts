import { Request, Response } from 'express';
import { emailService } from '../services/email.service';
import { PDFService, TermBillDocument } from '../services/pdf.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BILLS = 400;

function isValidEmail(value: unknown): boolean {
  return EMAIL_RE.test(String(value || '').trim());
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function schoolFromBody(body: any): Pick<
  TermBillDocument,
  | 'schoolName'
  | 'schoolAddress'
  | 'schoolPhone'
  | 'schoolEmail'
  | 'termName'
  | 'academicYearName'
  | 'bankName'
  | 'accountNumber'
  | 'accountName'
> {
  return {
    schoolName: String(body?.schoolName || 'School').trim() || 'School',
    schoolAddress: body?.schoolAddress ? String(body.schoolAddress) : undefined,
    schoolPhone: body?.schoolPhone ? String(body.schoolPhone) : undefined,
    schoolEmail: body?.schoolEmail ? String(body.schoolEmail) : undefined,
    termName: body?.termName ? String(body.termName) : undefined,
    academicYearName: body?.academicYearName ? String(body.academicYearName) : undefined,
    bankName: body?.bankName ? String(body.bankName) : undefined,
    accountNumber: body?.accountNumber ? String(body.accountNumber) : undefined,
    accountName: body?.accountName ? String(body.accountName) : undefined,
  };
}

function normalizeBill(raw: any, school: ReturnType<typeof schoolFromBody>): TermBillDocument | null {
  if (!raw || typeof raw !== 'object') return null;
  const studentName = String(raw.studentName || '').trim();
  const items = Array.isArray(raw.items)
    ? raw.items.map((item: any) => ({
        name: String(item?.name || 'Fee item'),
        quantity: Number(item?.quantity) > 0 ? Number(item.quantity) : 1,
        amount: Number(item?.amount) || 0,
      }))
    : [];
  const total = Number(raw.total);
  const computed = items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0);
  const parentVa = String(raw.virtualAccountNumber || '').trim();
  const hasParentVa = parentVa.length > 0;
  const schoolAccountNumber = String(raw.accountNumber || school.accountNumber || '').trim();
  const schoolBankName = String(raw.bankName || school.bankName || '').trim();
  const schoolAccountName = String(raw.accountName || school.accountName || '').trim();

  return {
    schoolName: school.schoolName,
    schoolAddress: school.schoolAddress,
    schoolPhone: school.schoolPhone,
    schoolEmail: school.schoolEmail,
    parentName: raw.parentName ? String(raw.parentName) : undefined,
    studentName: studentName || 'Student',
    admissionNumber: raw.admissionNumber ? String(raw.admissionNumber) : undefined,
    className: String(raw.className || '').trim() || 'Class',
    invoiceNumber: String(raw.invoiceNumber || '').trim(),
    items,
    total: Number.isFinite(total) ? total : computed,
    dueDate: raw.dueDate ? String(raw.dueDate) : undefined,
    termName: raw.termName ? String(raw.termName) : school.termName,
    academicYearName: raw.academicYearName ? String(raw.academicYearName) : school.academicYearName,
    paymentAccountKind: hasParentVa ? 'parent' : (schoolAccountNumber || schoolBankName ? 'school' : undefined),
    virtualAccountNumber: hasParentVa ? parentVa : undefined,
    virtualAccountBank: hasParentVa && raw.virtualAccountBank ? String(raw.virtualAccountBank) : undefined,
    virtualAccountName: hasParentVa && raw.virtualAccountName ? String(raw.virtualAccountName) : undefined,
    bankName: hasParentVa ? undefined : (schoolBankName || undefined),
    accountNumber: hasParentVa ? undefined : (schoolAccountNumber || undefined),
    accountName: hasParentVa ? undefined : (schoolAccountName || undefined),
    issuedAt: raw.issuedAt ? String(raw.issuedAt) : undefined,
  };
}

export class TermBillsController {
  /**
   * POST /api/school/term-bills/email
   * Emails each student bill individually to the parent, with a PDF attachment.
   */
  static async emailClassBills(req: Request, res: Response) {
    const bills = Array.isArray(req.body?.bills) ? req.body.bills : [];
    if (!bills.length) {
      return res.status(400).json({ success: false, message: 'bills array is required' });
    }
    if (bills.length > MAX_BILLS) {
      return res.status(400).json({ success: false, message: `Maximum ${MAX_BILLS} bills per request` });
    }

    const school = schoolFromBody(req.body);
    const results: Array<{ studentName: string; to?: string; status: string; reason?: string }> = [];

    for (const raw of bills) {
      const to = String(raw?.to || '').trim().toLowerCase();
      const bill = normalizeBill(raw, school);
      if (!bill) {
        results.push({ studentName: String(raw?.studentName || 'Student'), status: 'skipped', reason: 'invalid' });
        continue;
      }
      if (!isValidEmail(to)) {
        results.push({ studentName: bill.studentName, status: 'skipped', reason: 'no_email' });
        continue;
      }
      try {
        const pdf = await PDFService.generateTermBillPDF(bill);
        const sent = await emailService.sendTermBillEmail(to, { ...bill, className: bill.className }, pdf);
        results.push({
          studentName: bill.studentName,
          to,
          status: sent ? 'sent' : 'failed',
          reason: sent ? undefined : 'smtp_failed',
        });
      } catch (err: any) {
        console.error('[TermBills] Failed to email', bill.studentName, err?.message || err);
        results.push({ studentName: bill.studentName, to, status: 'failed', reason: err?.message || 'error' });
      }
      await delay(120);
    }

    const sent = results.filter((r) => r.status === 'sent').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    return res.status(200).json({
      success: true,
      sent,
      skipped,
      failed,
      total: results.length,
      results,
    });
  }

  /**
   * POST /api/school/term-bills/pdf
   * Returns a downloadable PDF for a single bill (same layout as the email attachment).
   */
  static async downloadPdf(req: Request, res: Response) {
    const school = schoolFromBody(req.body);
    const bill = normalizeBill(req.body?.bill || req.body, school);
    if (!bill || !bill.studentName) {
      return res.status(400).json({ success: false, message: 'bill details are required' });
    }
    try {
      const pdf = await PDFService.generateTermBillPDF(bill);
      const filename = emailService.safePdfFilename(bill.studentName, bill.invoiceNumber);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(pdf);
    } catch (err: any) {
      console.error('[TermBills] PDF generation failed', err?.message || err);
      return res.status(500).json({ success: false, message: 'Failed to generate bill PDF' });
    }
  }
}
