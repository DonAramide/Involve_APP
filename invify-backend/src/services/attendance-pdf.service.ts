// invify-backend/src/services/attendance-pdf.service.ts
import PDFDocument from 'pdfkit';
import { ClassReport } from '../modules/attendance/attendance-calculator';

export interface RegisterPdfOptions {
  schoolName: string;
  className: string;
  teacherName?: string;
  registrationNumber?: string;
  subjectName?: string;
  academicYear?: string;
  term?: string;
  weeks?: Array<{
    weekLabel: string;
    days: string[]; // e.g. ['M', 'T', 'W', 'T', 'F'] or dates
  }>;
  students: Array<{
    sn?: number;
    fullName: string;
    admissionNumber?: string;
    // Map of "weekIdx-dayIdx" => 'P' | 'A' | 'L' | 'E' | ''
    attendanceMap?: Record<string, string>;
  }>;
}

export interface ReportPdfOptions {
  schoolName: string;
  schoolAddress?: string;
  schoolMotto?: string;
  className: string;
  teacherName?: string;
  academicYear?: string;
  periodFrom: string;
  periodTo: string;
  report: ClassReport;
  studentsWithMeta: Array<{
    studentId: string;
    studentName: string;
    admissionNumber?: string;
    months: Record<string, { ratePercent: number | null }>;
    overall: { ratePercent: number | null };
    belowThreshold: boolean;
  }>;
}

export class AttendancePdfService {
  /**
   * PDF 1: Weekly Class Attendance Register (A4 Landscape)
   * Matches the visual layout and structure of Reference Image 2.
   */
  static async generateRegisterPdf(options: RegisterPdfOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 30,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (e) => reject(e));

      const weeks = options.weeks || [
        { weekLabel: 'WEEK 1', days: ['M', 'T', 'W', 'T', 'F'] },
        { weekLabel: 'WEEK 2', days: ['M', 'T', 'W', 'T', 'F'] },
        { weekLabel: 'WEEK 3', days: ['M', 'T', 'W', 'T', 'F'] },
        { weekLabel: 'WEEK 4', days: ['M', 'T', 'W', 'T', 'F'] },
        { weekLabel: 'WEEK 5', days: ['M', 'T', 'W', 'T', 'F'] },
      ];

      const drawHeader = () => {
        // School Name Header
        doc.font('Helvetica-Bold').fontSize(14).text(options.schoolName.toUpperCase(), 30, 30, { align: 'left' });
        doc.moveDown(0.2);
        doc.fontSize(12).text('CLASS ATTENDANCE REGISTER', 30, doc.y, { underline: true });
        doc.moveDown(0.6);

        // Metadata section
        const metaY = doc.y;
        doc.font('Helvetica-Bold').fontSize(9);

        // Row 1
        doc.text("TEACHER'S NAME: ", 30, metaY, { continued: true });
        doc.font('Helvetica').text((options.teacherName || '').padEnd(30, '.'), { continued: true });
        doc.font('Helvetica-Bold').text('   REGISTRATION NUMBER: ', { continued: true });
        doc.font('Helvetica').text((options.registrationNumber || '').padEnd(25, '.'));

        // Row 2
        doc.moveDown(0.4);
        const row2Y = doc.y;
        doc.font('Helvetica-Bold').text('SUBJECT: ', 30, row2Y, { continued: true });
        doc.font('Helvetica').text((options.subjectName || '').padEnd(22, '.'), { continued: true });
        doc.font('Helvetica-Bold').text('   TERM: ', { continued: true });
        doc.font('Helvetica').text((options.term || '').padEnd(16, '.'), { continued: true });
        doc.font('Helvetica-Bold').text('   YEAR: ', { continued: true });
        doc.font('Helvetica').text((options.academicYear || '').padEnd(16, '.'), { continued: true });
        doc.font('Helvetica-Bold').text('   FORM/CLASS: ', { continued: true });
        doc.font('Helvetica').text((options.className || '').padEnd(18, '.'));

        doc.moveDown(0.8);
      };

      drawHeader();

      // Table Setup
      // Available width: 841.89 - 60 = 781.89
      const snWidth = 30;
      const nameWidth = 200;
      const totalDays = weeks.reduce((acc, w) => acc + w.days.length, 0);
      const remainingWidth = 781.89 - snWidth - nameWidth;
      const dayCellWidth = Math.floor(remainingWidth / totalDays);

      const tableTop = doc.y;
      const headerRowHeight = 28;
      const rowHeight = 16;

      // Table Header row 1 (SN, NAME, WEEKS)
      let currentX = 30;
      doc.font('Helvetica-Bold').fontSize(8);

      // SN & NAME headers
      doc.rect(currentX, tableTop, snWidth, headerRowHeight).stroke();
      doc.text('SN', currentX + 5, tableTop + 8, { width: snWidth - 10, align: 'center' });
      currentX += snWidth;

      doc.rect(currentX, tableTop, nameWidth, headerRowHeight).stroke();
      doc.text('NAME', currentX + 8, tableTop + 8, { width: nameWidth - 16, align: 'left' });
      currentX += nameWidth;

      // Week column blocks
      weeks.forEach((w) => {
        const weekWidth = dayCellWidth * w.days.length;
        doc.rect(currentX, tableTop, weekWidth, 14).stroke();
        doc.text(w.weekLabel, currentX, tableTop + 3, { width: weekWidth, align: 'center' });

        // Day cells row
        w.days.forEach((day, dIdx) => {
          const dx = currentX + dIdx * dayCellWidth;
          doc.rect(dx, tableTop + 14, dayCellWidth, 14).stroke();
          doc.text(day, dx, tableTop + 17, { width: dayCellWidth, align: 'center' });
        });
        currentX += weekWidth;
      });

      let currentY = tableTop + headerRowHeight;

      // Student Rows
      const students = options.students || [];
      const studentCount = Math.max(students.length, 30); // show at least 30 rows like reference template

      for (let i = 0; i < studentCount; i++) {
        // Page overflow check
        if (currentY + rowHeight > 520) {
          doc.addPage();
          drawHeader();
          currentY = doc.y;
        }

        const student = students[i];
        let x = 30;

        // SN
        doc.rect(x, currentY, snWidth, rowHeight).stroke();
        doc.font('Helvetica').fontSize(8).text(String(i + 1), x + 2, currentY + 4, {
          width: snWidth - 4,
          align: 'center',
        });
        x += snWidth;

        // Name
        doc.rect(x, currentY, nameWidth, rowHeight).stroke();
        if (student) {
          const displayName = student.admissionNumber
            ? `${student.fullName} (${student.admissionNumber})`
            : student.fullName;
          doc.text(displayName, x + 6, currentY + 4, { width: nameWidth - 12, lineBreak: false });
        }
        x += nameWidth;

        // Days cells
        let colIndex = 0;
        weeks.forEach((w, wIdx) => {
          w.days.forEach((_, dIdx) => {
            const cellKey = `${wIdx}-${dIdx}`;
            const status = student?.attendanceMap?.[cellKey] || '';
            doc.rect(x, currentY, dayCellWidth, rowHeight).stroke();
            if (status) {
              doc.font('Helvetica-Bold').text(status.toUpperCase(), x, currentY + 4, {
                width: dayCellWidth,
                align: 'center',
              });
              doc.font('Helvetica');
            }
            x += dayCellWidth;
            colIndex++;
          });
        });

        currentY += rowHeight;
      }

      // Verification / Signature Section
      doc.moveDown(1.5);
      const sigY = Math.min(doc.y + 15, 540);
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text('LEGEND: P = Present | A = Absent | L = Late | E = Excused', 30, sigY);

      doc.font('Helvetica').fontSize(8);
      doc.text("Class Teacher's Signature: _______________________", 300, sigY);
      doc.text("Head Teacher's Signature: _______________________", 550, sigY);
      doc.text('Date: _______________', 720, sigY);

      doc.end();
    });
  }

  /**
   * PDF 2: Class Attendance Report (A4 Portrait)
   * Reproduces the exact visual hierarchy of Reference Image 1.
   */
  static async generateReportPdf(options: ReportPdfOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 35,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (e) => reject(e));

      const { report, studentsWithMeta } = options;

      // 1. HEADER
      doc.font('Helvetica-Bold').fontSize(16).text(options.schoolName.toUpperCase(), { align: 'center' });
      if (options.schoolMotto) {
        doc.font('Helvetica-Oblique').fontSize(9).text(options.schoolMotto, { align: 'center' });
      }
      if (options.schoolAddress) {
        doc.font('Helvetica').fontSize(8).fillColor('#444444').text(options.schoolAddress, { align: 'center' });
      }
      doc.fillColor('#000000');
      doc.moveDown(0.8);

      // Title
      doc.font('Helvetica-Bold').fontSize(13).text('CLASS ATTENDANCE REPORT', { align: 'right' });
      doc.moveDown(0.5);

      // Metadata line
      const metaY = doc.y;
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text('CLASS: ', 35, metaY, { continued: true });
      doc.font('Helvetica').text((options.className || '').padEnd(16, '_'), { continued: true });
      doc.font('Helvetica-Bold').text('  TEACHER: ', { continued: true });
      doc.font('Helvetica').text((options.teacherName || '').padEnd(20, '_'), { continued: true });
      doc.font('Helvetica-Bold').text('  ACADEMIC YEAR: ', { continued: true });
      doc.font('Helvetica').text((options.academicYear || '').padEnd(14, '_'), { continued: true });
      doc.font('Helvetica-Bold').text('  FROM: ', { continued: true });
      doc.font('Helvetica').text(options.periodFrom, { continued: true });
      doc.font('Helvetica-Bold').text('  TO: ', { continued: true });
      doc.font('Helvetica').text(options.periodTo);

      doc.moveDown(1.2);

      // 2. SUMMARY METRIC CARDS (4 Boxes with Blue Accents)
      const cardY = doc.y;
      const cardWidth = 120;
      const cardHeight = 44;
      const cardGap = 12;

      const drawCard = (x: number, label: string, value: string | number, subLabel?: string) => {
        doc.rect(x, cardY, cardWidth, cardHeight).fillAndStroke('#f0f4f8', '#cbd5e1');
        doc.fillColor('#1e293b').font('Helvetica').fontSize(7.5).text(label, x + 6, cardY + 6, {
          width: cardWidth - 12,
          align: 'left',
        });
        doc.font('Helvetica-Bold').fontSize(15).fillColor('#0f172a').text(String(value), x + 6, cardY + 20, {
          width: cardWidth - 12,
          align: 'right',
        });
        if (subLabel) {
          doc.font('Helvetica').fontSize(6).fillColor('#64748b').text(subLabel, x + 6, cardY + cardHeight - 8);
        }
      };

      let cardX = 35;
      drawCard(cardX, 'Number of Students', report.enrolledStudents);
      cardX += cardWidth + cardGap;
      drawCard(cardX, 'Number of Working Days', report.instructionalDays);
      cardX += cardWidth + cardGap;
      drawCard(cardX, 'Attendance Rate', report.overall.ratePercent !== null ? `${report.overall.ratePercent}%` : 'N/A');
      cardX += cardWidth + cardGap;
      drawCard(
        cardX,
        'Not meeting Requirements',
        report.belowThresholdCount,
        `Min Required: ${report.thresholdPercent}%`,
      );

      doc.y = cardY + cardHeight + 20;

      // 3. CLASS ATTENDANCE RATES (Monthly Table)
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9).text('CLASS ATTENDANCE RATES');
      doc.moveDown(0.3);

      const monthTableY = doc.y;
      const monthColWidth = 52;
      const labelColWidth = 140;

      // Header row
      doc.rect(35, monthTableY, labelColWidth, 16).fillAndStroke('#e2e8f0', '#94a3b8');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(7.5).text('', 40, monthTableY + 4);

      let mx = 35 + labelColWidth;
      report.months.forEach((m) => {
        doc.rect(mx, monthTableY, monthColWidth, 16).fillAndStroke('#e2e8f0', '#94a3b8');
        doc.fillColor('#0f172a').text(m.month, mx, monthTableY + 4, { width: monthColWidth, align: 'center' });
        mx += monthColWidth;
      });

      // Overall column
      doc.rect(mx, monthTableY, monthColWidth, 16).fillAndStroke('#cbd5e1', '#94a3b8');
      doc.fillColor('#0f172a').text('Overall', mx, monthTableY + 4, { width: monthColWidth, align: 'center' });

      // Row 1: Number of Working Days
      const r1Y = monthTableY + 16;
      doc.rect(35, r1Y, labelColWidth, 16).stroke();
      doc.font('Helvetica').fontSize(7.5).text('Number of Working Days', 40, r1Y + 4);
      mx = 35 + labelColWidth;
      report.months.forEach((m) => {
        doc.rect(mx, r1Y, monthColWidth, 16).stroke();
        doc.text(String(m.instructionalDays), mx, r1Y + 4, { width: monthColWidth, align: 'center' });
        mx += monthColWidth;
      });
      doc.rect(mx, r1Y, monthColWidth, 16).stroke();
      doc.font('Helvetica-Bold').text(String(report.instructionalDays), mx, r1Y + 4, {
        width: monthColWidth,
        align: 'center',
      });

      // Row 2: Average Attendance Rate
      const r2Y = r1Y + 16;
      doc.rect(35, r2Y, labelColWidth, 16).stroke();
      doc.font('Helvetica').fontSize(7.5).text('Average Attendance Rate', 40, r2Y + 4);
      mx = 35 + labelColWidth;
      report.months.forEach((m) => {
        doc.rect(mx, r2Y, monthColWidth, 16).stroke();
        doc.text(m.ratePercent !== null ? `${m.ratePercent}%` : '-', mx, r2Y + 4, {
          width: monthColWidth,
          align: 'center',
        });
        mx += monthColWidth;
      });
      doc.rect(mx, r2Y, monthColWidth, 16).stroke();
      doc.font('Helvetica-Bold').text(
        report.overall.ratePercent !== null ? `${report.overall.ratePercent}%` : '-',
        mx,
        r2Y + 4,
        { width: monthColWidth, align: 'center' },
      );

      doc.y = r2Y + 22;

      // 4. STUDENT ATTENDANCE RATES
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9).text('STUDENT ATTENDANCE RATES');
      doc.font('Helvetica-Oblique').fontSize(6.5).fillColor('#64748b').text(
        'Attendance Rate = (Number of Days Present + Late) / Working Days (Excused excluded from denominator)',
      );
      doc.moveDown(0.4);

      let studentTableY = doc.y;
      const sRowHeight = 15;
      const sNameWidth = 140;

      // Student Header
      const drawStudentTableHeader = (y: number) => {
        doc.rect(35, y, sNameWidth, 16).fillAndStroke('#e2e8f0', '#94a3b8');
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(7.5).text('Student Name', 40, y + 4);

        let sx = 35 + sNameWidth;
        report.months.forEach((m) => {
          doc.rect(sx, y, monthColWidth, 16).fillAndStroke('#e2e8f0', '#94a3b8');
          doc.fillColor('#0f172a').text(m.month, sx, y + 4, { width: monthColWidth, align: 'center' });
          sx += monthColWidth;
        });

        doc.rect(sx, y, monthColWidth, 16).fillAndStroke('#cbd5e1', '#94a3b8');
        doc.fillColor('#0f172a').text('Overall', sx, y + 4, { width: monthColWidth, align: 'center' });
      };

      drawStudentTableHeader(studentTableY);
      let curY = studentTableY + 16;

      // Student rows
      studentsWithMeta.forEach((st) => {
        if (curY + sRowHeight > 780) {
          doc.addPage();
          curY = 40;
          drawStudentTableHeader(curY);
          curY += 16;
        }

        const isBelow = st.belowThreshold;
        const rowBg = isBelow ? '#fef2f2' : '#ffffff';
        const textColor = isBelow ? '#b91c1c' : '#0f172a';

        // Name cell
        doc.rect(35, curY, sNameWidth, sRowHeight).fillAndStroke(rowBg, '#cbd5e1');
        doc.fillColor(textColor).font(isBelow ? 'Helvetica-Bold' : 'Helvetica').fontSize(7);
        const displayName = st.admissionNumber ? `${st.studentName} (${st.admissionNumber})` : st.studentName;
        doc.text(displayName, 40, curY + 4, { width: sNameWidth - 8, lineBreak: false });

        // Month cells
        let sx = 35 + sNameWidth;
        report.months.forEach((m) => {
          doc.rect(sx, curY, monthColWidth, sRowHeight).fillAndStroke(rowBg, '#cbd5e1');
          const mRate = st.months[m.month]?.ratePercent;
          doc.fillColor(textColor).text(mRate !== null && mRate !== undefined ? `${mRate}%` : '-', sx, curY + 4, {
            width: monthColWidth,
            align: 'center',
          });
          sx += monthColWidth;
        });

        // Overall cell
        doc.rect(sx, curY, monthColWidth, sRowHeight).fillAndStroke(isBelow ? '#fee2e2' : '#f8fafc', '#94a3b8');
        const oRate = st.overall?.ratePercent;
        doc.fillColor(textColor).font('Helvetica-Bold').text(oRate !== null && oRate !== undefined ? `${oRate}%` : '-', sx, curY + 4, {
          width: monthColWidth,
          align: 'center',
        });

        curY += sRowHeight;
      });

      // Footer / Page numbers
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text(
          `Generated on ${new Date().toLocaleDateString('en-GB')} | Page ${i + 1} of ${range.count}`,
          35,
          810,
          { align: 'center', width: 525 },
        );
      }

      doc.end();
    });
  }
}
