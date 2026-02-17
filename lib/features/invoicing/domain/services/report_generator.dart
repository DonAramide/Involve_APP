import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import '../entities/invoice.dart';
import '../../../settings/domain/entities/settings.dart';
import '../../../../core/utils/currency_formatter.dart';

class ReportGenerator {
  static Future<void> generateSalesReport({
    required List<Invoice> invoices,
    required AppSettings settings,
    DateTimeRange? dateRange,
  }) async {
    final pdf = pw.Document();

    final dateStr = dateRange != null
        ? '${DateFormat('MMM dd, yyyy').format(dateRange.start)} - ${DateFormat('MMM dd, yyyy').format(dateRange.end)}'
        : 'All Time';

    final totalAmount = invoices.fold<double>(0, (sum, item) => sum + item.totalAmount);

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return [
            // Header
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      settings.organizationName.toUpperCase(),
                      style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
                    ),
                    if (settings.address.isNotEmpty) pw.Text(settings.address),
                    if (settings.phone.isNotEmpty) pw.Text('Tel: ${settings.phone}'),
                  ],
                ),
                if (settings.logo != null)
                  pw.Container(
                    width: 60,
                    height: 60,
                    child: pw.Image(pw.MemoryImage(settings.logo!)),
                  ),
              ],
            ),
            pw.SizedBox(height: 20),
            pw.Divider(),
            pw.SizedBox(height: 10),
            
            // Title
            pw.Center(
              child: pw.Text(
                'SALES INVOLVE REPORT',
                style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold, color: PdfColors.blue),
              ),
            ),
            pw.Center(
              child: pw.Text('Period: $dateStr', style: const pw.TextStyle(fontSize: 12)),
            ),
            pw.SizedBox(height: 20),

            // Table
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey300),
              columnWidths: {
                0: const pw.FlexColumnWidth(2), // Date
                1: const pw.FlexColumnWidth(3), // Invoice #
                2: const pw.FlexColumnWidth(3), // Customer
                3: const pw.FlexColumnWidth(2), // Method
                4: const pw.FlexColumnWidth(2), // Amount
              },
              children: [
                // Table Header
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.grey100),
                  children: [
                    _tableHeader('Date'),
                    _tableHeader('Invoice ID'),
                    _tableHeader('Customer'),
                    _tableHeader('Method'),
                    _tableHeader('Amount'),
                  ],
                ),
                // Table Rows
                ...invoices.map((invoice) {
                  return pw.TableRow(
                    children: [
                      _tableCell(DateFormat('yyyy-MM-dd HH:mm').format(invoice.dateCreated)),
                      _tableCell(invoice.invoiceNumber),
                      _tableCell(invoice.customerName ?? '-'),
                      _tableCell(invoice.paymentMethod ?? '-'),
                      _tableCell(CurrencyFormatter.formatWithSymbol(invoice.totalAmount, symbol: settings.currency), align: pw.Alignment.centerRight),
                    ],
                  );
                }),
              ],
            ),
            pw.SizedBox(height: 20),

            // Summary Footer
            pw.Divider(),
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('Total Invoices: ${invoices.length}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                pw.Text(
                  'GRAND TOTAL: ${settings.currency} ${CurrencyFormatter.format(totalAmount)}',
                  style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, color: PdfColors.blue),
                ),
              ],
            ),
            pw.SizedBox(height: 40),
            pw.Center(
              child: pw.Text('Generated on ${DateFormat('yyyy-MM-dd HH:mm').format(DateTime.now())}',
                  style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey500)),
            ),
          ];
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'Sales_Report_${DateFormat('yyyyMMdd').format(DateTime.now())}.pdf',
    );
  }

  static pw.Widget _tableHeader(String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(8),
      child: pw.Text(text, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
    );
  }

  static pw.Widget _tableCell(String text, {pw.Alignment align = pw.Alignment.centerLeft}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(8),
      child: pw.Align(
        alignment: align,
        child: pw.Text(text),
      ),
    );
  }
}

class DateTimeRange {
  final DateTime start;
  final DateTime end;
  DateTimeRange({required this.start, required this.end});
}
