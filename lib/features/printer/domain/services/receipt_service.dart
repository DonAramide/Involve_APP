import 'dart:typed_data';
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../../invoicing/domain/entities/invoice.dart';
import '../../../settings/domain/entities/settings.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';

class ReceiptService {
  Future<Uint8List> generateReceiptPdf(Invoice invoice, AppSettings settings) async {
    final pdf = pw.Document();
    final template = settings.defaultInvoiceTemplate;

    // Decode logo if available
    pw.ImageProvider? logoImage;
    if (settings.logo != null && settings.logo!.isNotEmpty) {
      try {
        logoImage = pw.MemoryImage(settings.logo!);
      } catch (e) {
        // Ignore logo error
      }
    }

    if (template == 'classic') {
      return _generateClassicA4(pdf, invoice, settings, logoImage);
    }

    return _generateThermalRoll(pdf, invoice, settings, logoImage);
  }

  Future<Uint8List> _generateThermalRoll(pw.Document pdf, Invoice invoice, AppSettings settings, pw.ImageProvider? logoImage) async {
    final dateFormat = DateFormat('yyyy-MM-dd HH:mm');

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80, 
        margin: const pw.EdgeInsets.all(5),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
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
              
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Invoice #${invoice.invoiceNumber}'),
                  pw.Text(dateFormat.format(invoice.dateCreated)),
                ],
              ),
              pw.Divider(),
              
              pw.Table(
                columnWidths: {
                  0: const pw.FlexColumnWidth(2), 
                  1: const pw.FlexColumnWidth(1), 
                  2: const pw.FlexColumnWidth(1), 
                },
                children: [
                   pw.TableRow(
                     children: [
                       pw.Text('Item', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                       pw.Text('Qty', textAlign: pw.TextAlign.center, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                       pw.Text('Total', textAlign: pw.TextAlign.right, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                     ]
                   ),
                   ...invoice.items.map((item) {
                     String itemName = item.item.name;
                     if (item.type == 'service' && item.serviceMeta != null) {
                       itemName += '\n${_getServiceDateRange(item.serviceMeta)}';
                     }
                     return pw.TableRow(
                       children: [
                         pw.Text(itemName),
                         pw.Text('${item.quantity} x ${CurrencyFormatter.format(item.unitPrice)}', textAlign: pw.TextAlign.center),
                         pw.Text(CurrencyFormatter.format(item.quantity * item.unitPrice), textAlign: pw.TextAlign.right),
                       ]
                     );
                   }).toList(),
                ],
              ),
              pw.Divider(),
              
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
              pw.Text(settings.receiptFooter, style: const pw.TextStyle(fontSize: 10)),
              pw.Text('Powered by IIPS', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey)),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  Future<Uint8List> _generateClassicA4(pw.Document pdf, Invoice invoice, AppSettings settings, pw.ImageProvider? logoImage) async {
    final dateFormat = DateFormat('dd MMMM, yyyy');

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(settings.organizationName.toUpperCase(), 
                          style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold)),
                      if (settings.businessDescription != null)
                        pw.Text(settings.businessDescription!, 
                            style: pw.TextStyle(fontSize: 12, fontStyle: pw.FontStyle.italic)),
                      pw.SizedBox(height: 10),
                      pw.Text(settings.address),
                      pw.Text('Phone: ${settings.phone}'),
                      if (settings.taxId != null && settings.taxId!.isNotEmpty)
                        pw.Text('Tax ID: ${settings.taxId}'),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text('INVOICE', style: pw.TextStyle(fontSize: 32, fontWeight: pw.FontWeight.bold, color: PdfColors.grey)),
                      pw.SizedBox(height: 20),
                      pw.Text('INVOICE No: ${invoice.invoiceNumber}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                      pw.Text('DATE: ${dateFormat.format(invoice.dateCreated)}'),
                      if (logoImage != null)
                        pw.Padding(
                          padding: const pw.EdgeInsets.only(top: 10),
                          child: pw.Image(logoImage, height: 60),
                        ),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 40),

              // Delivery Address
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('BILL TO:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12)),
                  pw.SizedBox(height: 4),
                  pw.Text(invoice.customerName ?? 'Valued Customer', style: pw.TextStyle(fontSize: 14)),
                  if (invoice.customerAddress != null)
                    pw.Text(invoice.customerAddress!, style: pw.TextStyle(fontSize: 12)),
                ],
              ),
              pw.SizedBox(height: 40),

              // Table
              pw.Table(
                border: pw.TableBorder.all(color: PdfColors.grey300),
                columnWidths: {
                  0: const pw.FlexColumnWidth(1), // Qty
                  1: const pw.FlexColumnWidth(4), // Description
                  2: const pw.FlexColumnWidth(1.5), // Unit Price
                  3: const pw.FlexColumnWidth(1.5), // Amount
                },
                children: [
                  pw.TableRow(
                    decoration: const pw.BoxDecoration(color: PdfColors.grey100),
                    children: [
                      _tableHeader('QUANTITY'),
                      _tableHeader('DESCRIPTION'),
                      _tableHeader('UNIT PRICE'),
                      _tableHeader('AMOUNT'),
                    ],
                  ),
                  ...invoice.items.map((item) {
                    String itemName = item.item.name;
                    if (item.type == 'service' && item.serviceMeta != null) {
                      itemName += '\n${_getServiceDateRange(item.serviceMeta)}';
                    }
                    return pw.TableRow(
                      children: [
                        _tableCell(item.quantity.toString(), align: pw.Alignment.center),
                        _tableCell(itemName),
                        _tableCell(CurrencyFormatter.format(item.unitPrice), align: pw.Alignment.centerRight),
                        _tableCell(CurrencyFormatter.format(item.total), align: pw.Alignment.centerRight),
                      ],
                    );
                  }).toList(),
                ],
              ),
              
              // Totals Table Alignment
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.end,
                children: [
                  pw.Container(
                    width: 200,
                    child: pw.Table(
                      border: pw.TableBorder.all(color: PdfColors.grey300),
                      children: [
                        _summaryRow('SUBTOTAL', CurrencyFormatter.format(invoice.subtotal)),
                        if (invoice.taxAmount > 0)
                          _summaryRow('SALES TAX (${(settings.taxRate * 100).toStringAsFixed(0)}%)', CurrencyFormatter.format(invoice.taxAmount)),
                        if (invoice.discountAmount > 0)
                          _summaryRow('DISCOUNT', '-${CurrencyFormatter.format(invoice.discountAmount)}'),
                        _summaryRow('TOTAL DUE', '${settings.currency} ${CurrencyFormatter.format(invoice.totalAmount)}', isBold: true),
                      ],
                    ),
                  ),
                ],
              ),
              
              pw.Spacer(),

              // Notes Footer
              pw.Divider(),
              pw.SizedBox(height: 10),
              pw.Text('Notes:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
              pw.Text('1. Make all cheques payable to ${settings.organizationName}'),
              pw.Text('2. If you have any questions concerning this invoice, contact ${settings.phone}'),
              
              pw.SizedBox(height: 30),
              pw.Center(
                child: pw.Text('THANK YOU FOR YOUR BUSINESS!', 
                    style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
              ),
              pw.SizedBox(height: 10),
              pw.Center(
                child: pw.Text('Powered by IIPS', 
                    style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey)),
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  pw.Widget _tableHeader(String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 5, horizontal: 8),
      child: pw.Text(text, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
    );
  }

  pw.Widget _tableCell(String text, {pw.Alignment align = pw.Alignment.centerLeft}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 5, horizontal: 8),
      child: pw.Align(alignment: align, child: pw.Text(text, style: const pw.TextStyle(fontSize: 10))),
    );
  }

  pw.TableRow _summaryRow(String label, String value, {bool isBold = false}) {
    return pw.TableRow(
      children: [
        pw.Padding(
          padding: const pw.EdgeInsets.all(5),
          child: pw.Text(label, style: pw.TextStyle(fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal, fontSize: 10)),
        ),
        pw.Padding(
          padding: const pw.EdgeInsets.all(5),
          child: pw.Align(
            alignment: pw.Alignment.centerRight,
            child: pw.Text(value, style: pw.TextStyle(fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal, fontSize: 10)),
          ),
        ),
      ],
    );
  }

  String _getServiceDateRange(String? metaStr) {
    if (metaStr == null) return '';
    try {
      final meta = jsonDecode(metaStr);
      final start = DateTime.parse(meta['startDate']);
      final end = DateTime.parse(meta['endDate']);
      final fmt = DateFormat('MM/dd HH:mm');
      return '${fmt.format(start)} - ${fmt.format(end)}';
    } catch (e) {
      return '';
    }
  }
}
