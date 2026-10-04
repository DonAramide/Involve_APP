// src/services/pdf.service.ts
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

function invifyLogoPath(): string | null {
  const candidates = [
    path.join(__dirname, '../../assets/invify-logo.png'),
    path.join(process.cwd(), 'assets/invify-logo.png'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

export interface TermBillItem {
  name: string;
  quantity?: number;
  amount: number;
}

export interface TermBillDocument {
  schoolName: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  parentName?: string;
  studentName: string;
  admissionNumber?: string;
  className: string;
  invoiceNumber: string;
  items: TermBillItem[];
  total: number;
  dueDate?: string;
  termName?: string;
  academicYearName?: string;
  virtualAccountNumber?: string;
  virtualAccountBank?: string;
  virtualAccountName?: string;
  /** Exclusive: parent dedicated VA, or school bank if the parent has none. */
  paymentAccountKind?: 'parent' | 'school';
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  issuedAt?: string;
}

export function buildTermBillSubject(schoolName: string, studentName: string, className?: string): string {
  const school = String(schoolName || 'School').trim() || 'School';
  const student = String(studentName || 'Student').trim() || 'Student';
  const cls = String(className || '').trim();
  return cls ? `${school}: Fee Bill for ${student} (${cls})` : `${school}: Fee Bill for ${student}`;
}

function formatNgn(amount: number): string {
  const n = Number(amount) || 0;
  return `NGN ${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export class PDFService {
  /**
   * Generates a professional, NERDC-compliant PDF for a lesson note.
   */
  static async generateLessonNotePDF(note: any, tenantName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Lesson Note - ${note.subject}`,
          Author: 'Invify SaaS',
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // --- HEADER ---
      doc.font('Helvetica-Bold').fontSize(18).text(tenantName.toUpperCase(), { align: 'center' });
      doc.fontSize(14).text('LESSON NOTE', { align: 'center' });
      doc.moveDown(1.5);

      // --- METADATA TABLE-LIKE VIEW ---
      doc.font('Helvetica-Bold').fontSize(11);
      const startY = doc.y;
      
      doc.text('SUBJECT:', 50, startY);
      doc.font('Helvetica').text(note.subject.toUpperCase(), 150, startY);
      
      doc.font('Helvetica-Bold').text('CLASS:', 50, doc.y + 5);
      doc.font('Helvetica').text(note.class_level.toUpperCase(), 150, doc.y - 12);
      
      doc.font('Helvetica-Bold').text('TERM/WEEK:', 50, doc.y + 5);
      doc.font('Helvetica').text(`${note.term} Term / Week ${note.week}`, 150, doc.y - 12);
      
      doc.font('Helvetica-Bold').text('TOPIC:', 50, doc.y + 5);
      doc.font('Helvetica').text(note.topic.toUpperCase(), 150, doc.y - 12);
      
      doc.moveDown(2);
      doc.strokeColor('#3f51b5').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // --- SECTIONS ---
      const sections = [
        { title: 'LEARNING OBJECTIVES', key: 'objectives', type: 'list' },
        { title: 'INSTRUCTIONAL MATERIALS', key: 'materials', type: 'list' },
        { title: 'INTRODUCTION', key: 'introduction', type: 'text' },
        { title: 'PRESENTATION STEPS', key: 'steps', type: 'steps' },
        { title: 'EVALUATION', key: 'evaluation', type: 'list' },
        { title: 'ASSIGNMENT', key: 'assignment', type: 'text' },
      ];

      const structured = note.content.structured;

      sections.forEach((section) => {
        const data = structured[section.key];
        if (!data) return;

        doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a237e').text(section.title);
        doc.moveDown(0.5);
        doc.fillColor('black').font('Helvetica').fontSize(10);

        if (section.type === 'list' && Array.isArray(data)) {
          data.forEach((item: string) => {
            doc.text(`• ${item}`, { indent: 15 });
          });
        } else if (section.type === 'steps' && Array.isArray(data)) {
          data.forEach((step: any, index: number) => {
            const stepTitle = step.title || `Step ${index + 1}`;
            const stepDesc = step.description || step;
            doc.font('Helvetica-Bold').text(`${stepTitle}: `, { continued: true, indent: 15 });
            doc.font('Helvetica').text(stepDesc);
            doc.moveDown(0.3);
          });
        } else {
          doc.text(data, { align: 'justify' });
        }

        doc.moveDown(1.5);
      });

      // --- FOOTER ---
      const bottom = doc.page.height - 100;
      doc.strokeColor('#eeeeee').lineWidth(0.5).moveTo(50, bottom).lineTo(545, bottom).stroke();
      doc.moveDown(1);

      doc.font('Helvetica').fontSize(10);
      doc.text('Date: ________________________', 50, bottom + 20);
      doc.text("Teacher's Signature: ________________________", 300, bottom + 20);

      // Subtle Invify Branding
      doc.fontSize(8).fillColor('#9e9e9e').opacity(0.5)
         .text('Generated by Invify', 50, doc.page.height - 30, { align: 'center' });

      doc.end();
    });
  }

  /**
   * Official school term fee bill (A4) for parent email attachment.
   */
  static async generateTermBillPDF(bill: TermBillDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 48,
        info: {
          Title: `Fee Bill - ${bill.studentName}`,
          Author: bill.schoolName || 'Invify',
          Subject: bill.invoiceNumber,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const accent = '#0e7490';
      const pageWidth = doc.page.width;
      const left = 48;
      const right = pageWidth - 48;
      const contentWidth = right - left;

      doc.rect(0, 0, pageWidth, 8).fill(accent);

      doc.moveDown(0.8);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(16)
        .text((bill.schoolName || 'SCHOOL').toUpperCase(), { align: 'center' });
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      if (bill.schoolAddress) doc.text(bill.schoolAddress, { align: 'center' });
      const contact = [bill.schoolPhone, bill.schoolEmail].filter(Boolean).join('  ·  ');
      if (contact) doc.text(contact, { align: 'center' });

      doc.moveDown(0.8);
      doc.strokeColor(accent).lineWidth(1.5).moveTo(left, doc.y).lineTo(right, doc.y).stroke();
      doc.moveDown(0.6);
      doc.fillColor(accent).font('Helvetica-Bold').fontSize(14)
        .text('OFFICIAL TERM FEE BILL', { align: 'center' });
      doc.moveDown(0.4);
      doc.fillColor('#64748b').font('Helvetica').fontSize(9)
        .text('Please retain this document for your records. A copy is also attached to this email.', { align: 'center' });
      doc.moveDown(1);

      const issued = bill.issuedAt || new Date().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      const termLabel = [bill.termName, bill.academicYearName].filter(Boolean).join('  ·  ');

      const colMid = left + contentWidth / 2;
      const metaY = doc.y;
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text('BILL TO', left, metaY);
      doc.font('Helvetica').fontSize(10).text(bill.parentName || 'Parent / Guardian', left, metaY + 14);
      doc.fillColor('#64748b').fontSize(9).text('Parent / Guardian', left, metaY + 28);

      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text('STUDENT', colMid, metaY);
      doc.font('Helvetica').fontSize(10).text(bill.studentName, colMid, metaY + 14);
      const studentMeta = [
        bill.admissionNumber ? `Adm. No: ${bill.admissionNumber}` : null,
        bill.className ? `Class: ${bill.className}` : null,
      ].filter(Boolean).join('   ');
      doc.fillColor('#64748b').fontSize(9).text(studentMeta, colMid, metaY + 28);

      doc.y = metaY + 52;
      doc.fillColor('#334155').font('Helvetica').fontSize(9);
      doc.text(`Invoice: ${bill.invoiceNumber || '—'}`, left, doc.y, { continued: true });
      doc.text(`        Issued: ${issued}`, { continued: true });
      if (bill.dueDate) doc.text(`        Due: ${bill.dueDate}`, { continued: true });
      if (termLabel) doc.text(`        ${termLabel}`);
      else doc.text('');
      doc.moveDown(1);

      const tableTop = doc.y;
      const qtyX = left + contentWidth - 170;
      const amtX = left + contentWidth - 90;
      const rowH = 22;

      doc.rect(left, tableTop, contentWidth, rowH).fill(accent);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
      doc.text('FEE ITEM', left + 10, tableTop + 7, { width: qtyX - left - 20 });
      doc.text('QTY', qtyX, tableTop + 7, { width: 50, align: 'right' });
      doc.text('AMOUNT', amtX, tableTop + 7, { width: 80, align: 'right' });

      let y = tableTop + rowH;
      const items = Array.isArray(bill.items) && bill.items.length
        ? bill.items
        : [{ name: 'School fees', quantity: 1, amount: bill.total }];

      items.forEach((item, index) => {
        if (y > doc.page.height - 160) {
          doc.addPage();
          y = 48;
        }
        if (index % 2 === 0) {
          doc.rect(left, y, contentWidth, rowH).fill('#f1f5f9');
        }
        doc.fillColor('#0f172a').font('Helvetica').fontSize(9);
        doc.text(String(item.name || 'Fee item'), left + 10, y + 7, { width: qtyX - left - 20 });
        doc.text(String(item.quantity ?? 1), qtyX, y + 7, { width: 50, align: 'right' });
        doc.text(formatNgn(Number(item.amount) || 0), amtX, y + 7, { width: 80, align: 'right' });
        y += rowH;
      });

      doc.rect(left, y, contentWidth, 28).fill('#ecfeff');
      doc.fillColor(accent).font('Helvetica-Bold').fontSize(11);
      doc.text('TOTAL PAYABLE', left + 10, y + 8, { width: qtyX - left - 20 });
      doc.text(formatNgn(Number(bill.total) || 0), amtX, y + 8, { width: 80, align: 'right' });
      y += 42;
      doc.y = y;

      const useParentAccount = !!(bill.virtualAccountNumber || bill.paymentAccountKind === 'parent');
      const useSchoolAccount = !useParentAccount && !!(bill.accountNumber || bill.bankName);
      if (useParentAccount || useSchoolAccount) {
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('PAYMENT INSTRUCTIONS');
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(9).fillColor('#334155');
        if (useParentAccount) {
          doc.text('Pay this bill into your dedicated parent account below. Use the student name as the payment reference.');
          doc.moveDown(0.4);
          doc.font('Helvetica-Bold').text('Parent dedicated account');
          doc.font('Helvetica');
          if (bill.virtualAccountName) doc.text(`Account name: ${bill.virtualAccountName}`);
          if (bill.virtualAccountBank) doc.text(`Bank: ${bill.virtualAccountBank}`);
          if (bill.virtualAccountNumber) doc.text(`Account number: ${bill.virtualAccountNumber}`);
        } else {
          doc.text('This parent does not have a dedicated account. Pay into the school account below. Use the student name as the payment reference.');
          doc.moveDown(0.4);
          doc.font('Helvetica-Bold').text('School account');
          doc.font('Helvetica');
          if (bill.accountName) doc.text(`Account name: ${bill.accountName}`);
          if (bill.bankName) doc.text(`Bank: ${bill.bankName}`);
          if (bill.accountNumber) doc.text(`Account number: ${bill.accountNumber}`);
        }
        doc.moveDown(1);
      }

      doc.font('Helvetica').fontSize(8).fillColor('#64748b')
        .text(
          'This is an official fee bill issued by the school. For questions about this invoice, contact the school using the details above.',
          { align: 'left' },
        );
      doc.moveDown(0.6);
      doc.fontSize(8).fillColor('#94a3b8')
        .text('Generated by Invify School Finance', { align: 'center' });

      doc.end();
    });
  }

  /**
   * Downloadable terminal activation certificate emailed after support approval.
   */
  static async generateTerminalActivationPDF(docInfo: TerminalActivationDocument): Promise<Buffer> {
    const code = String(docInfo.activationCode || '').trim();
    const qrPng = code
      ? await QRCode.toBuffer(code, {
          type: 'png',
          width: 320,
          margin: 1,
          errorCorrectionLevel: 'M',
        })
      : null;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 48,
        info: {
          Title: `Terminal Activation - ${docInfo.businessName}`,
          Author: 'Invify',
          Subject: docInfo.activationCode,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = doc.page.width;
      const left = 48;
      const contentWidth = pageWidth - 96;

      doc.rect(0, 0, pageWidth, 10).fill('#1e293b');
      const logo = invifyLogoPath();
      if (logo) {
        const logoWidth = 78;
        const logoX = (pageWidth - logoWidth) / 2;
        const logoY = 22;
        doc.image(logo, logoX, logoY, { width: logoWidth });
        doc.y = logoY + 102;
      } else {
        doc.moveDown(1.2);
      }
      doc.fillColor('#b45309').font('Helvetica-Bold').fontSize(11)
        .text('INVIFY LICENSED TERMINAL', { align: 'center', characterSpacing: 2 });
      doc.moveDown(0.6);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(22)
        .text(docInfo.businessName || 'Tenant', { align: 'center' });
      doc.moveDown(0.3);
      doc.fillColor('#475569').font('Helvetica').fontSize(12)
        .text('This file activates one terminal. Scan the QR code or enter the key on the device.', { align: 'center' });

      doc.moveDown(1.4);
      const boxY = doc.y;
      doc.roundedRect(left, boxY, contentWidth, 92, 8).fillAndStroke('#fffbeb', '#f59e0b');
      doc.fillColor('#92400e').font('Helvetica-Bold').fontSize(10)
        .text('SECURE ACTIVATION KEY', left, boxY + 16, { width: contentWidth, align: 'center' });
      doc.fillColor('#0f172a').font('Courier-Bold').fontSize(22)
        .text(docInfo.activationCode || '', left, boxY + 42, { width: contentWidth, align: 'center' });
      doc.y = boxY + 110;

      if (qrPng) {
        const size = 150;
        const qrX = left + (contentWidth - size) / 2;
        const qrY = doc.y;
        doc.image(qrPng, qrX, qrY, { width: size, height: size });
        doc.y = qrY + size + 8;
        doc.fillColor('#475569').font('Helvetica').fontSize(10)
          .text('Scan this QR code. It contains the activation key.', { align: 'center' });
        doc.moveDown(0.8);
      }

      const rows: Array<[string, string]> = [
        ['Business', docInfo.businessName || '—'],
        ['Mode', docInfo.mode || '—'],
        ['Plan', docInfo.plan || '—'],
        ['Validity', `${Number(docInfo.durationDays) || 0} Days`],
        ['Expiration', docInfo.expiry || '—'],
        ['Device suffix', docInfo.deviceSuffix || '—'],
      ];
      rows.forEach(([label, value]) => {
        const y = doc.y;
        doc.fillColor('#64748b').font('Helvetica').fontSize(11).text(label, left, y, { width: 140 });
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(value, left + 150, y, { width: contentWidth - 150 });
        doc.moveDown(0.7);
      });

      doc.moveDown(1.2);
      doc.fillColor('#334155').font('Helvetica').fontSize(10)
        .text('Keep this file private. The key works once, on the terminal it is entered into.', { align: 'left' });
      doc.moveDown(1);
      doc.fillColor('#94a3b8').fontSize(8)
        .text('Generated by Invify after approval by support@iips.app', { align: 'center' });

      doc.end();
    });
  }
}

export interface TerminalActivationDocument {
  businessName: string;
  mode?: string;
  plan?: string;
  durationDays?: number;
  expiry?: string;
  activationCode: string;
  deviceSuffix?: string;
}
