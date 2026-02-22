import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/invoicing/domain/entities/report_date_range.dart';

class ReportGenerator {
  static Future<pw.Document> buildReport({
    required List<Invoice> invoices,
    required AppSettings settings,
    InvReportDateRange? dateRange,
  }) async {
    final pdf = pw.Document();

    final dateStr = dateRange != null
        ? '${DateFormat('MMM dd, yyyy').format(dateRange.start)} - ${DateFormat('MMM dd, yyyy').format(dateRange.end)}'
        : 'All Time';

    final totalAmount = invoices.fold<double>(0, (sum, item) => sum + item.totalAmount);

    // Prepare table data
    final headers = ['Date', 'Invoice ID', 'Customer', 'Method', 'Sold By', 'Amount'];
    final data = invoices.map((invoice) {
      return [
        DateFormat('yyyy-MM-dd HH:mm').format(invoice.dateCreated),
        invoice.invoiceNumber,
        invoice.customerName ?? '-',
        invoice.paymentMethod ?? '-',
        invoice.staffName ?? 'Admin',
        CurrencyFormatter.formatWithSymbol(invoice.totalAmount, symbol: settings.currency),
      ];
    }).toList();

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
                    child: _safeImage(settings.logo!),
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
                style: pw.TextStyle(
                  fontSize: 22, 
                  fontWeight: pw.FontWeight.bold, 
                  color: _getPrimaryColor(settings)
                ),
              ),
            ),
            pw.Center(
              child: pw.Text('Period: $dateStr', style: const pw.TextStyle(fontSize: 12)),
            ),
            pw.SizedBox(height: 20),

            // Table using fromTextArray for better layout/performance
            pw.Table.fromTextArray(
              headers: headers,
              data: data,
              border: pw.TableBorder.all(color: PdfColors.grey300),
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
              headerDecoration: const pw.BoxDecoration(color: PdfColors.grey100),
              cellAlignment: pw.Alignment.centerLeft,
              cellAlignments: {
                5: pw.Alignment.centerRight,
              },
              columnWidths: {
                0: const pw.FlexColumnWidth(2.2), // Date
                1: const pw.FlexColumnWidth(1.8), // ID
                2: const pw.FlexColumnWidth(2.5), // Customer
                3: const pw.FlexColumnWidth(1.5), // Method
                4: const pw.FlexColumnWidth(2.0), // Sold By
                5: const pw.FlexColumnWidth(2.0), // Amount
              },
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
                  style: pw.TextStyle(
                    fontSize: 16, 
                    fontWeight: pw.FontWeight.bold, 
                    color: _getPrimaryColor(settings)
                  ),
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

    return pdf;
  }

  static Future<void> generateSalesReport({
    required List<Invoice> invoices,
    required AppSettings settings,
    InvReportDateRange? dateRange,
  }) async {
    try {
      final pdf = await buildReport(
        invoices: invoices,
        settings: settings,
        dateRange: dateRange,
      );

      final bytes = await pdf.save();

      // Platform specific export logic
      if (kIsWeb) {
        // layoutPdf is the most reliable way to handle PDF preview/download on Web
        await Printing.layoutPdf(
          onLayout: (PdfPageFormat format) async => bytes,
          name: 'Sales_Report_${DateFormat('yyyyMMdd_HHmm').format(DateTime.now())}.pdf',
        );
      } else {
        await Printing.sharePdf(
          bytes: bytes,
          filename: 'Sales_Report_${DateFormat('yyyyMMdd_HHmm').format(DateTime.now())}.pdf',
        );
      }
    } catch (e) {
      // Re-throw to be caught by the UI
      rethrow;
    }
  }

  static Future<void> generateInventoryReport({
    required List<Map<String, dynamic>> reportData,
    required AppSettings settings,
    InvReportDateRange? dateRange,
  }) async {
    try {
      final csvContent = buildInventoryCSV(reportData, settings);
      final bytes = Uint8List.fromList(csvContent.codeUnits);
      
      final dateStr = dateRange != null
          ? '_${DateFormat('yyyyMMdd').format(dateRange.start)}'
          : '';
          
      await Printing.sharePdf(
        bytes: bytes,
        filename: 'Inventory_Report$dateStr.csv',
      );
    } catch (e) {
      rethrow;
    }
  }

  static String buildInventoryCSV(List<Map<String, dynamic>> reportData, AppSettings settings) {
    final buffer = StringBuffer();
    // Headers
    buffer.writeln('Product,Price (${settings.currency}),Current Stock,Total Units Sold,Revenue (${settings.currency})');
    
    // Rows
    for (final item in reportData) {
      final name = item['name'].toString().replaceAll(',', ''); // Simple escape
      buffer.writeln('$name,${item['price']},${item['stockQty']},${item['totalSold']},${item['totalRevenue']}');
    }
    
    return buffer.toString();
  }

  static PdfColor _getPrimaryColor(AppSettings settings) {
    try {
      if (settings.primaryColor != null) {
        return PdfColor.fromInt(settings.primaryColor!);
      }
    } catch (_) {}
    return PdfColors.blue;
  }

  static pw.Widget _safeImage(Uint8List bytes) {
    try {
      return pw.Image(pw.MemoryImage(bytes));
    } catch (e) {
      return pw.SizedBox.shrink();
    }
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

