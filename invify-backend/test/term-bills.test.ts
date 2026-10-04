jest.mock('../src/services/email.service', () => ({
  emailService: {
    sendTermBillEmail: jest.fn().mockResolvedValue(true),
    safePdfFilename: (name: string, invoice?: string) => `Fee-Bill-${name}-${invoice || 'bill'}.pdf`,
  },
}));

import { emailService } from '../src/services/email.service';
import { PDFService, buildTermBillSubject } from '../src/services/pdf.service';
import { TermBillsController } from '../src/controllers/term-bills.controller';

const mail = emailService as jest.Mocked<typeof emailService>;

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe('Term bills parent email', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mail.sendTermBillEmail.mockResolvedValue(true);
  });

  test('PDF is a downloadable official bill with student, class, and items', async () => {
    const pdf = await PDFService.generateTermBillPDF({
      schoolName: 'Sunrise Academy',
      schoolAddress: '12 School Road, Lagos',
      schoolPhone: '08012345678',
      parentName: 'Mrs Ada Obi',
      studentName: 'Chinedu Obi',
      admissionNumber: 'JSS2-014',
      className: 'JSS 2',
      invoiceNumber: 'BILL-JSS2-014-1',
      termName: 'First Term',
      academicYearName: '2026/2027',
      items: [
        { name: 'just school fees', quantity: 1, amount: 1 },
        { name: 'sport wear', quantity: 1, amount: 2 },
      ],
      total: 3,
      dueDate: '15 Dec 2026',
      virtualAccountNumber: '1234567890',
      virtualAccountBank: 'Wema Bank',
    });

    expect(pdf.slice(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(500);
  });

  test('emails each parent individually and skips missing emails', async () => {
    const req: any = {
      body: {
        schoolName: 'Sunrise Academy',
        bills: [
          {
            to: 'parent.one@example.com',
            parentName: 'Parent One',
            studentName: 'Ada',
            className: 'JSS 2',
            invoiceNumber: 'BILL-1',
            items: [{ name: 'just school fees', quantity: 1, amount: 1 }],
            total: 1,
          },
          {
            to: 'parent.two@example.com',
            parentName: 'Parent Two',
            studentName: 'Emeka',
            className: 'JSS 2',
            invoiceNumber: 'BILL-2',
            items: [{ name: 'sport wear', quantity: 1, amount: 2 }],
            total: 2,
          },
          {
            to: '',
            studentName: 'No Email',
            className: 'JSS 2',
            invoiceNumber: 'BILL-3',
            items: [{ name: 'english', amount: 2 }],
            total: 2,
          },
        ],
      },
    };
    const res = mockRes();

    await TermBillsController.emailClassBills(req, res);

    expect(mail.sendTermBillEmail).toHaveBeenCalledTimes(2);
    expect(mail.sendTermBillEmail.mock.calls[0][0]).toBe('parent.one@example.com');
    expect(mail.sendTermBillEmail.mock.calls[1][0]).toBe('parent.two@example.com');
    expect(mail.sendTermBillEmail.mock.calls[0][1].studentName).toBe('Ada');
    expect(Buffer.isBuffer(mail.sendTermBillEmail.mock.calls[0][2])).toBe(true);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.sent).toBe(2);
    expect(payload.skipped).toBe(1);
    expect(payload.failed).toBe(0);
  });

  test('subject names the school, student, and class', () => {
    expect(buildTermBillSubject('Sunrise Academy', 'Chinedu Obi', 'JSS 2'))
      .toBe('Sunrise Academy: Fee Bill for Chinedu Obi (JSS 2)');
  });

  test('uses each parent dedicated account, otherwise the school account', async () => {
    const req: any = {
      body: {
        schoolName: 'Sunrise Academy',
        bankName: 'GTBank',
        accountNumber: '0001112223',
        accountName: 'Sunrise Academy',
        bills: [
          {
            to: 'parent.one@example.com',
            parentName: 'Parent One',
            studentName: 'Ada',
            className: 'JSS 2',
            invoiceNumber: 'BILL-1',
            virtualAccountNumber: '5556667778',
            virtualAccountBank: 'Wema Bank',
            virtualAccountName: 'Ada Parent',
            items: [{ name: 'just school fees', amount: 1 }],
            total: 1,
          },
          {
            to: 'parent.two@example.com',
            parentName: 'Parent Two',
            studentName: 'Emeka',
            className: 'JSS 2',
            invoiceNumber: 'BILL-2',
            items: [{ name: 'sport wear', amount: 2 }],
            total: 2,
          },
        ],
      },
    };
    const res = mockRes();
    await TermBillsController.emailClassBills(req, res);

    const first = mail.sendTermBillEmail.mock.calls[0][1];
    const second = mail.sendTermBillEmail.mock.calls[1][1];

    expect(first.paymentAccountKind).toBe('parent');
    expect(first.virtualAccountNumber).toBe('5556667778');
    expect(first.virtualAccountBank).toBe('Wema Bank');
    expect(first.accountNumber).toBeUndefined();

    expect(second.paymentAccountKind).toBe('school');
    expect(second.virtualAccountNumber).toBeUndefined();
    expect(second.accountNumber).toBe('0001112223');
    expect(second.bankName).toBe('GTBank');
    expect(second.accountName).toBe('Sunrise Academy');
  });

  test('download endpoint returns a PDF attachment', async () => {
    const req: any = {
      body: {
        schoolName: 'Sunrise Academy',
        studentName: 'Chinedu Obi',
        className: 'JSS 2',
        invoiceNumber: 'BILL-9',
        items: [{ name: 'maths books', amount: 1 }],
        total: 1,
      },
    };
    const res = mockRes();
    await TermBillsController.downloadPdf(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('attachment'),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.send.mock.calls[0][0];
    expect(Buffer.isBuffer(body)).toBe(true);
    expect(body.slice(0, 4).toString()).toBe('%PDF');
  });
});
