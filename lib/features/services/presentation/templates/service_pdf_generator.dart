import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import '../../domain/entities/service_job.dart';
import '../../domain/entities/service_payment.dart';
import '../../domain/utils/job_description_codec.dart';
import '../utils/job_staff_store.dart';

class ServiceJobPdfGenerator {
  static Future<void> generateAndShow({
    required ServiceJob job,
    required List<ServicePayment> payments,
    required AppSettings? settings,
  }) async {
    final assignment = await JobStaffStore.getAssignment(job.id) ??
        await JobStaffStore.getAssignment(job.jobId);
    job = job.copyWith(staffName: assignment?.staffName ?? job.staffName);
    final pdf = pw.Document();
    final symbol = settings?.currency ?? '₦';
    final staffName = job.staffName?.trim();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(settings?.organizationName ?? 'BUSINESS NAME',
                          style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold)),
                      pw.Text(settings?.address ?? 'Address Line'),
                      pw.Text('Phone: ${settings?.phone ?? ''}'),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text('SERVICE RECEIPT',
                          style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold, color: PdfColors.blue)),
                      pw.Text('Job ID: ${job.jobId}'),
                      pw.Text('Date: ${job.createdAt.toString().split(' ')[0]}'),
                      if (staffName != null && staffName.isNotEmpty)
                        pw.Text('Staff: $staffName'),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 40),

              // Customer Info
              pw.Text('BILL TO:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
              pw.Text(job.customerName ?? 'Walk-in Customer'),
              if (staffName != null && staffName.isNotEmpty) ...[
                pw.SizedBox(height: 8),
                pw.Text('STAFF:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                pw.Text(staffName),
              ],
              pw.SizedBox(height: 30),

              // Job Details
              pw.Text('JOB DESCRIPTION:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
              pw.Text(job.title, style: pw.TextStyle(fontSize: 16)),
              if (job.description != null && job.description!.trim().isNotEmpty)
                pw.Padding(
                  padding: const pw.EdgeInsets.only(top: 6),
                  child: pw.Text(JobDescriptionCodec.toPlainText(job.description)),
                ),
              pw.SizedBox(height: 20),

              // Breakdown Table
              pw.Table(
                border: pw.TableBorder.all(color: PdfColors.grey300),
                children: [
                  pw.TableRow(
                    decoration: const pw.BoxDecoration(color: PdfColors.grey100),
                    children: [
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text('Item / Activity', style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text('Category', style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text('Price', style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text('Qty', style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text('Total', style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                    ],
                  ),
                  // Labor
                  if (job.laborAmount > 0)
                    pw.TableRow(
                      children: [
                        pw.Padding(padding: const pw.EdgeInsets.all(8), child: pw.Text('Workmanship / Labor')),
                        pw.Padding(padding: const pw.EdgeInsets.all(8), child: pw.Text('Labor')),
                        pw.Padding(
                            padding: const pw.EdgeInsets.all(8),
                            child: pw.Text(CurrencyFormatter.format(job.laborAmount))),
                        pw.Padding(padding: const pw.EdgeInsets.all(8), child: pw.Text('1')),
                        pw.Padding(
                            padding: const pw.EdgeInsets.all(8),
                            child: pw.Text(CurrencyFormatter.format(job.laborAmount))),
                      ],
                    ),
                  // Items
                  ...job.items.map((item) => pw.TableRow(
                        children: [
                          pw.Padding(padding: const pw.EdgeInsets.all(8), child: pw.Text(item.name)),
                          pw.Padding(padding: const pw.EdgeInsets.all(8), child: pw.Text(item.category ?? 'Material')),
                          pw.Padding(
                              padding: const pw.EdgeInsets.all(8),
                              child: pw.Text(CurrencyFormatter.format(item.price))),
                          pw.Padding(
                              padding: const pw.EdgeInsets.all(8),
                              child: pw.Text(item.quantity.toInt().toString())),
                          pw.Padding(
                              padding: const pw.EdgeInsets.all(8),
                              child: pw.Text(CurrencyFormatter.format(item.price * item.quantity))),
                        ],
                      )),
                ],
              ),

              pw.SizedBox(height: 20),

              // Totals
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.end,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      _totalRow('Total Amount', job.totalAmount, symbol),
                      _totalRow('Amount Paid', job.appliedAmountPaid, symbol),
                      pw.Divider(color: PdfColors.black),
                      _totalRow('Balance Due', job.remainingBalance, symbol, isBold: true),
                      if (job.warrantyDuration != null)
                        pw.Padding(
                          padding: const pw.EdgeInsets.symmetric(vertical: 2),
                          child: pw.Row(
                            mainAxisSize: pw.MainAxisSize.min,
                            children: [
                              pw.Text('Warranty: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                              pw.Text(job.warrantyDuration!, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                            ],
                          ),
                        ),
                    ],
                  ),
                ],
              ),

              pw.Spacer(),
              pw.Divider(),
              if (staffName != null && staffName.isNotEmpty)
                pw.Center(child: pw.Text('Served by: $staffName')),
              pw.Center(child: pw.Text(settings?.receiptFooter ?? 'Thank you for your business!')),
              pw.Center(child: pw.Text('Generated by Involve APP', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey))),
            ],
          );
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'Receipt_${job.jobId}.pdf',
    );
  }

  static pw.Widget _totalRow(String label, double value, String symbol, {bool isBold = false}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        mainAxisSize: pw.MainAxisSize.min,
        children: [
          pw.Text('$label: ', style: pw.TextStyle(fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal)),
          pw.Text(CurrencyFormatter.formatWithSymbol(value, symbol: symbol),
              style: pw.TextStyle(fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal)),
        ],
      ),
    );
  }
}
