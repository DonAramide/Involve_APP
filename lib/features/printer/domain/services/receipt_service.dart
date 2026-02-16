import 'dart:typed_data';
import 'package:flutter/services.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../../invoicing/domain/entities/invoice.dart';
import '../../../settings/domain/entities/settings.dart';
import 'package:intl/intl.dart';
import 'package:invify/core/utils/currency_formatter.dart';

class ReceiptService {
  Future<Uint8List> generateReceiptPdf(Invoice invoice, AppSettings settings) async {
    final pdf = pw.Document();
    
    // Load font if necessary, but standard fonts work for basic receipt
    // final font = await PdfGoogleFonts.nunitoExtraLight();

    // Decode logo if available
    pw.ImageProvider? logoImage;
    if (settings.logo != null && settings.logo!.isNotEmpty) {
      try {
        logoImage = pw.MemoryImage(settings.logo!);
      } catch (e) {
        // Ignore logo error
      }
    }

    final dateFormat = DateFormat('yyyy-MM-dd HH:mm');

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80, // 80mm roll width
        margin: const pw.EdgeInsets.all(5), // Small margins for thermal
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              // Header
              if (logoImage != null)
                pw.Container(
                  height: 60,
                  width: 60,
                  alignment: pw.Alignment.center,
                  child: pw.Image(logoImage),
                ),
              pw.SizedBox(height: 5),
              pw.Text(settings.organizationName, 
                  style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 16)),
              pw.Text(settings.address, textAlign: pw.TextAlign.center),
              if (settings.phone.isNotEmpty) pw.Text('Tel: ${settings.phone}'),
              if (settings.taxId != null && settings.taxId!.isNotEmpty) pw.Text('Tax ID: ${settings.taxId}'),
              pw.Divider(),
              
              // Invoice Info
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Invoice #${invoice.id}'),
                  pw.Text(dateFormat.format(invoice.dateCreated)),
                ],
              ),
              pw.Divider(),
              
              // Items
              pw.Table(
                columnWidths: {
                  0: const pw.FlexColumnWidth(2), // Item
                  1: const pw.FlexColumnWidth(1), // Qty
                  2: const pw.FlexColumnWidth(1), // Total
                },
                children: [
                   // Header
                   pw.TableRow(
                     children: [
                       pw.Text('Item', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                       pw.Text('Qty', textAlign: pw.TextAlign.center, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                       pw.Text('Total', textAlign: pw.TextAlign.right, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                     ]
                   ),
                   // Rows
                   ...invoice.items.map((item) {
                     return pw.TableRow(
                       children: [
                         pw.Text(item.item.name),
                         pw.Text('${item.quantity} x ${CurrencyFormatter.format(item.unitPrice)}', textAlign: pw.TextAlign.center),
                         pw.Text(CurrencyFormatter.format(item.quantity * item.unitPrice), textAlign: pw.TextAlign.right),
                       ]
                     );
                   }).toList(),
                ],
              ),
              pw.Divider(),
              
              // Totals
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Subtotal:'),
                  pw.Text(CurrencyFormatter.format(invoice.subtotal)),
                ],
              ),
              if (settings.taxEnabled && invoice.taxAmount > 0)
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Tax:'),
                  pw.Text(CurrencyFormatter.format(invoice.taxAmount)),
                ],
              ),
              if (settings.discountEnabled && invoice.discountAmount > 0)
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Discount:'),
                  pw.Text('-${CurrencyFormatter.format(invoice.discountAmount)}'),
                ],
              ),
              pw.Divider(),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('TOTAL', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 14)),
                  pw.Text('${settings.currency} ${CurrencyFormatter.format(invoice.totalAmount)}', 
                      style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 14)),
                ],
              ),
              
              pw.SizedBox(height: 10),
              pw.Text('Thank you for your patronage!', style: const pw.TextStyle(fontSize: 10)),
              pw.Text('Powered by IIPS', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey)),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }
}
