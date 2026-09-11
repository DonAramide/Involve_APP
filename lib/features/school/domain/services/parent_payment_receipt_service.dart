import 'dart:typed_data';

import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/invoicing/domain/templates/invoice_template.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';

class ParentPaymentReceiptService {
  ParentPaymentReceiptService._();

  static String methodLabel(String source) {
    switch (source) {
      case 'pos':
        return 'Card';
      case 'company_account':
        return 'School account';
      case 'cash':
        return 'Cash';
      case 'va_deposit':
        return 'Virtual account';
      default:
        return source.replaceAll('_', ' ');
    }
  }

  static List<PrintCommand> thermalCommands({
    required ParentPaymentRecord payment,
    required SchoolParent parent,
    required List<Student> children,
    required AppSettings settings,
  }) {
    final money = CurrencyFormatter.formatWithSymbol;
    final when = DateFormat('dd MMM yyyy HH:mm').format(payment.createdAt);
    String childName(int id) {
      for (final s in children) {
        if (s.id == id) return s.fullName;
      }
      return 'Student $id';
    }

    return [
      TextCommand(settings.organizationName, isBold: true, align: 'center'),
      if (settings.address.trim().isNotEmpty)
        TextCommand(settings.address, align: 'center'),
      if (settings.phone.trim().isNotEmpty)
        TextCommand(settings.phone, align: 'center'),
      DividerCommand(),
      TextCommand('PARENT PAYMENT RECEIPT', isBold: true, align: 'center'),
      TextCommand(when, align: 'center'),
      DividerCommand(),
      TextCommand('Parent: ${parent.fullName}'),
      if ((parent.phone ?? '').isNotEmpty) TextCommand('Phone: ${parent.phone}'),
      TextCommand('Ref: ${payment.reference}'),
      TextCommand('Method: ${methodLabel(payment.source)}'),
      DividerCommand(),
      TextCommand('Amount: ${money(payment.amount)}', isBold: true),
      TextCommand('Applied to fees: ${money(payment.appliedToDebt)}'),
      TextCommand('Parent credit: ${money(payment.toCredit)}'),
      TextCommand('Outstanding after: ${money(payment.parentOutstandingAfter)}'),
      if (payment.allocations.isNotEmpty) ...[
        DividerCommand(),
        TextCommand('Allocation', isBold: true),
        ...payment.allocations.map(
          (a) => TextCommand(
            '${childName(a.studentId)}  ${money(a.allocated)}',
          ),
        ),
      ],
      DividerCommand(),
      TextCommand(settings.receiptFooter.isNotEmpty ? settings.receiptFooter : 'Thank you', align: 'center'),
      SizedBoxCommand(height: 2),
    ];
  }

  static Future<Uint8List> buildPdf({
    required ParentPaymentRecord payment,
    required SchoolParent parent,
    required List<Student> children,
    required AppSettings settings,
  }) async {
    final font = await PdfGoogleFonts.robotoRegular();
    final bold = await PdfGoogleFonts.robotoBold();
    final money = CurrencyFormatter.formatWithSymbol;
    final when = DateFormat('dd MMMM yyyy, HH:mm').format(payment.createdAt);
    String childName(int id) {
      for (final s in children) {
        if (s.id == id) return '${s.fullName} (${s.admissionNumber})';
      }
      return 'Student $id';
    }

    final doc = pw.Document();
    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a5,
        margin: const pw.EdgeInsets.all(28),
        build: (context) {
          pw.TextStyle t([bool isBold = false, double size = 11]) => pw.TextStyle(
                font: isBold ? bold : font,
                fontSize: size,
              );
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(settings.organizationName, style: t(true, 16)),
              if (settings.address.trim().isNotEmpty)
                pw.Text(settings.address, style: t(false, 9)),
              if (settings.phone.trim().isNotEmpty)
                pw.Text(settings.phone, style: t(false, 9)),
              pw.SizedBox(height: 12),
              pw.Text('PARENT PAYMENT RECEIPT', style: t(true, 13)),
              pw.SizedBox(height: 4),
              pw.Text(when, style: t(false, 10)),
              pw.Divider(),
              pw.Text('Parent: ${parent.fullName}', style: t(true)),
              if ((parent.phone ?? '').isNotEmpty)
                pw.Text('Phone: ${parent.phone}', style: t()),
              pw.Text('Reference: ${payment.reference}', style: t()),
              pw.Text('Method: ${methodLabel(payment.source)}', style: t()),
              pw.SizedBox(height: 10),
              pw.Table(
                border: pw.TableBorder.all(color: PdfColors.grey400, width: 0.4),
                children: [
                  _row('Amount received', money(payment.amount), t, header: true),
                  _row('Applied to fees', money(payment.appliedToDebt), t),
                  _row('Added to parent credit', money(payment.toCredit), t),
                  _row('Outstanding before', money(payment.parentOutstandingBefore), t),
                  _row('Outstanding after', money(payment.parentOutstandingAfter), t),
                  _row('Parent credit after', money(payment.parentCreditAfter), t),
                ],
              ),
              if (payment.allocations.isNotEmpty) ...[
                pw.SizedBox(height: 12),
                pw.Text('Child allocation', style: t(true, 12)),
                pw.SizedBox(height: 6),
                pw.Table(
                  border: pw.TableBorder.all(color: PdfColors.grey400, width: 0.4),
                  children: [
                    pw.TableRow(
                      decoration: const pw.BoxDecoration(color: PdfColors.grey200),
                      children: [
                        _cell('Child', t, bold: true),
                        _cell('Before', t, bold: true),
                        _cell('Applied', t, bold: true),
                        _cell('After', t, bold: true),
                      ],
                    ),
                    ...payment.allocations.map(
                      (a) => pw.TableRow(
                        children: [
                          _cell(childName(a.studentId), t),
                          _cell(money(a.outstandingBefore), t),
                          _cell(money(a.allocated), t),
                          _cell(money(a.outstandingAfter), t),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
              pw.Spacer(),
              pw.Text(
                settings.receiptFooter.isNotEmpty ? settings.receiptFooter : 'Thank you.',
                style: t(false, 9),
              ),
              pw.Text('Powered by Invify.org', style: t(false, 8)),
            ],
          );
        },
      ),
    );
    return doc.save();
  }

  static pw.TableRow _row(
    String label,
    String value,
    pw.TextStyle Function([bool, double]) t, {
    bool header = false,
  }) {
    return pw.TableRow(
      decoration: header ? const pw.BoxDecoration(color: PdfColors.grey200) : null,
      children: [
        _cell(label, t, bold: header),
        _cell(value, t, bold: header),
      ],
    );
  }

  static pw.Widget _cell(String text, pw.TextStyle Function([bool, double]) t, {bool bold = false}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      child: pw.Text(text, style: t(bold, 10)),
    );
  }
}
