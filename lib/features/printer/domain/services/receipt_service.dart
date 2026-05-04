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
import 'package:involve_app/core/utils/number_to_words.dart';
import '../../../settings/domain/entities/user_plan.dart';

class ReceiptService {
  Future<Uint8List> generateReceiptPdf(Invoice invoice, AppSettings settings, {bool? useCustomPricesOverride, String? receiptTitle, UserPlan? userPlan}) async {
    final font = await PdfGoogleFonts.notoSansRegular();
    final boldFont = await PdfGoogleFonts.notoSansBold();

    final pdf = pw.Document(
      theme: pw.ThemeData.withFont(
        base: font,
        bold: boldFont,
      ),
    );
    final template = settings.defaultInvoiceTemplate == 'compact' && settings.businessMode == 'school' 
        ? 'school_academic' 
        : settings.defaultInvoiceTemplate;
    final bool useCustomPrices = useCustomPricesOverride ?? settings.customReceiptPricingEnabled;

    // Decode logo if available and enabled
    pw.ImageProvider? logoImage;
    if (settings.showLogo && settings.logo != null && settings.logo!.isNotEmpty) {
      try {
        logoImage = pw.MemoryImage(settings.logo!);
      } catch (e) {
        // Ignore logo error
      }
    }

    // Decode admin signature if available and enabled
    pw.ImageProvider? adminSignatureImage;
    if (settings.showAdminSignature && settings.adminSignature != null && settings.adminSignature!.isNotEmpty) {
      try {
        adminSignatureImage = pw.MemoryImage(settings.adminSignature!);
      } catch (e) {
        // Ignore signature error
      }
    }

    if (template == 'classic' || template == 'classic_a4' || template == 'professional' || template == 'detailed' || template == 'modern') {
      return _generateClassicA4(pdf, invoice, settings, logoImage, adminSignatureImage, useCustomPrices, template: template, userPlan: userPlan);
    }
    
    if (template == 'school_teal') {
      return _generateSchoolTeal(pdf, invoice, settings, logoImage, adminSignatureImage, useCustomPrices, receiptTitle: receiptTitle, userPlan: userPlan);
    }
    if (template == 'school_color') {
      return _generateSchoolColor(pdf, invoice, settings, logoImage, adminSignatureImage, useCustomPrices, receiptTitle: receiptTitle, userPlan: userPlan);
    }
    if (template == 'school_academic') {
      return _generateSchoolAcademic(pdf, invoice, settings, logoImage, adminSignatureImage, useCustomPrices, receiptTitle: receiptTitle, userPlan: userPlan);
    }
    if (template == 'school_traditional') {
      return _generateSchoolTraditional(pdf, invoice, settings, logoImage, adminSignatureImage, useCustomPrices, receiptTitle: receiptTitle, userPlan: userPlan);
    }

    return _generateThermalRoll(pdf, invoice, settings, logoImage, adminSignatureImage, useCustomPrices, template: template, receiptTitle: receiptTitle, userPlan: userPlan);
  }

  Future<Uint8List> _generateThermalRoll(pw.Document pdf, Invoice invoice, AppSettings settings, pw.ImageProvider? logoImage, 
    pw.ImageProvider? adminSignatureImage,
    bool useCustomPrices, 
    {String? template, String? receiptTitle, UserPlan? userPlan}) async {
    final dateFormat = DateFormat('yyyy-MM-dd HH:mm');
    final bool isPro = userPlan?.isValid == true && !userPlan!.isBasic;

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80, 
        margin: const pw.EdgeInsets.all(5),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              if (logoImage != null && template != 'minimalist')
                pw.Container(
                  height: 60,
                  width: 60,
                  alignment: pw.Alignment.center,
                  child: pw.Image(logoImage),
                ),
              pw.SizedBox(height: 5),
              pw.Text(settings.organizationName, 
                  style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: template == 'compact' ? 14 : 16)),
              pw.Text(settings.address, textAlign: pw.TextAlign.center),
              if (settings.phone.isNotEmpty) pw.Text('Tel: ${settings.phone}'),
              if (settings.taxId != null && settings.taxId!.isNotEmpty) pw.Text('Tax ID: ${settings.taxId}'),
              pw.Divider(),
              
              if (template == 'classic' || template == 'professional' || template == 'detailed') ...[
                pw.Align(
                  alignment: pw.Alignment.centerLeft,
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(settings.businessMode == 'school' ? 'STUDENT INFO:' : 'BILL TO:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                      pw.Text(invoice.customerName ?? (settings.businessMode == 'school' ? 'N/A' : 'Valued Customer')),
                      if (invoice.customerPhone != null) pw.Text('Tel: ${invoice.customerPhone}'),
                    ],
                  ),
                ),
                pw.Divider(),
              ],
              
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Invoice #${invoice.invoiceNumber}', style: pw.TextStyle(fontWeight: (template == 'classic' || template == 'professional') ? pw.FontWeight.bold : pw.FontWeight.normal)),
                  pw.Text(dateFormat.format(invoice.dateCreated)),
                ],
              ),
              if (invoice.staffName != null && (template == 'classic' || template == 'professional'))
                pw.Align(alignment: pw.Alignment.centerLeft, child: pw.Text('Sold By: ${invoice.staffName!.toUpperCase()}')),
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
                     final usePrint = useCustomPrices && item.printPrice != null;
                     final unitPrice = usePrint ? item.printPrice! : item.unitPrice;
                     final total = usePrint ? item.totalPrint : item.total;

                     return pw.TableRow(
                       children: [
                         pw.Text(itemName),
                         pw.Text('${item.quantity} x ${CurrencyFormatter.format(unitPrice)}', textAlign: pw.TextAlign.center),
                         pw.Text(CurrencyFormatter.format(total), textAlign: pw.TextAlign.right),
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
                  pw.Text('EXPECTED AMOUNT', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 14)),
                  pw.Text('${settings.currency} ${CurrencyFormatter.format(useCustomPrices && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount)}', 
                      style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 14)),
                ],
              ),
              pw.SizedBox(height: 4),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                   pw.Container(
                    padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: pw.BoxDecoration(
                      border: pw.Border.all(color: invoice.balanceAmount <= 0 ? PdfColors.green : PdfColors.red),
                    ),
                    child: pw.Text(
                      invoice.balanceAmount <= 0 ? 'PAID' : 'DUE',
                      style: pw.TextStyle(
                        fontWeight: pw.FontWeight.bold, 
                        fontSize: 10,
                        color: invoice.balanceAmount <= 0 ? PdfColors.green : PdfColors.red,
                      ),
                    ),
                  ),
                  pw.Align(
                    alignment: pw.Alignment.centerRight,
                    child: pw.Text(
                      'Amount in Words: ${NumberToWords.convert(
                        useCustomPrices && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount,
                        currency: settings.currencyName,
                        subunit: settings.currencySubunit,
                      )} Only', 
                      style: pw.TextStyle(fontSize: 9, fontStyle: pw.FontStyle.italic)
                    ),
                  ),
                ],
              ),

              if (settings.showAccountDetails && settings.bankName != null) ...[
                pw.SizedBox(height: 6),
                pw.Text('Bank: ${settings.bankName}', style: const pw.TextStyle(fontSize: 9)),
                if (settings.accountNumber != null) pw.Text('Acc No: ${settings.accountNumber}', style: const pw.TextStyle(fontSize: 9)),
                if (settings.accountName != null) pw.Text('Acc Name: ${settings.accountName}', style: const pw.TextStyle(fontSize: 9)),
              ],

              if (invoice.balanceAmount > 0) ...[
                pw.SizedBox(height: 4),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('PAID AMOUNT:'),
                    pw.Text(CurrencyFormatter.format(invoice.amountPaid)),
                  ],
                ),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('BALANCE DUE:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                    pw.Text(CurrencyFormatter.format(invoice.balanceAmount), style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  ],
                ),
              ],
              
              pw.SizedBox(height: 10),
              if (adminSignatureImage != null)
                pw.Column(
                  children: [
                    pw.Text('Authorized Signature:', style: const pw.TextStyle(fontSize: 8)),
                    pw.SizedBox(height: 4),
                    pw.Container(
                      height: 40,
                      width: 80,
                      child: pw.Image(adminSignatureImage),
                    ),
                    pw.SizedBox(height: 10),
                  ],
                ),
              pw.Text(settings.receiptFooter, style: const pw.TextStyle(fontSize: 10)),
              pw.SizedBox(height: 10),
              pw.Center(
                child: pw.Text(isPro ? '✨ Invify Pro Edition' : 'Powered by IIPS', 
                    style: pw.TextStyle(fontSize: 8, color: isPro ? PdfColors.blue : PdfColors.grey, fontWeight: isPro ? pw.FontWeight.bold : pw.FontWeight.normal)),
              ),
              pw.SizedBox(height: 10),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  Future<Uint8List> _generateClassicA4(pw.Document pdf, Invoice invoice, AppSettings settings, pw.ImageProvider? logoImage, pw.ImageProvider? adminSignatureImage, bool useCustomPrices, {String? template, UserPlan? userPlan}) async {
    final dateFormat = DateFormat('dd MMMM, yyyy');
    final bool isPro = userPlan?.isValid == true && !userPlan!.isBasic;

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
                      if (settings.showCacNumber && settings.cacNumber != null && settings.cacNumber!.isNotEmpty)
                        pw.Text('CAC NO: ${settings.cacNumber}', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
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
              pw.SizedBox(height: template == 'modern' ? 20 : 40),

              // Delivery Address
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(settings.businessMode == 'school' ? 'STUDENT:' : 'BILL TO:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12)),
                  pw.SizedBox(height: 4),
                  pw.Text(invoice.customerName ?? (settings.businessMode == 'school' ? 'N/A' : 'Valued Customer'), style: pw.TextStyle(fontSize: 14)),
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
                    final usePrint = useCustomPrices && item.printPrice != null;
                    final unitPrice = usePrint ? item.printPrice! : item.unitPrice;
                    final total = usePrint ? item.totalPrint : item.total;

                    return pw.TableRow(
                      children: [
                        _tableCell(item.quantity.toString(), align: pw.Alignment.center),
                        _tableCell(itemName),
                        _tableCell(CurrencyFormatter.format(unitPrice), align: pw.Alignment.centerRight),
                        _tableCell(CurrencyFormatter.format(total), align: pw.Alignment.centerRight),
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
                    child: pw.Column(
                      children: [
                        pw.Table(
                          border: pw.TableBorder.all(color: PdfColors.grey300),
                          children: [
                            _summaryRow('SUBTOTAL', CurrencyFormatter.format(invoice.subtotal)),
                            if (invoice.taxAmount > 0)
                              _summaryRow('SALES TAX (${(settings.taxRate * 100).toStringAsFixed(0)}%)', CurrencyFormatter.format(invoice.taxAmount)),
                            if (invoice.discountAmount > 0)
                              _summaryRow('DISCOUNT', '-${CurrencyFormatter.format(invoice.discountAmount)}'),
                            _summaryRow('EXPECTED AMOUNT', '${settings.currency} ${CurrencyFormatter.format(useCustomPrices && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount)}', isBold: true),
                            if (invoice.balanceAmount > 0) ...[
                              _summaryRow('PAID AMOUNT', CurrencyFormatter.format(invoice.amountPaid)),
                              _summaryRow('BALANCE DUE', CurrencyFormatter.format(invoice.balanceAmount), isBold: true),
                            ],
                          ],
                        ),
                        if (settings.businessMode == 'school') ...[
                          pw.SizedBox(height: 10),
                          pw.Align(
                            alignment: pw.Alignment.centerRight,
                            child: pw.Text(
                              'Amount in Words: ${NumberToWords.convert(
                                useCustomPrices && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount,
                                currency: settings.currencyName,
                                subunit: settings.currencySubunit,
                              )}',
                              style: pw.TextStyle(fontSize: 10, fontStyle: pw.FontStyle.italic, fontWeight: pw.FontWeight.bold),
                            ),
                          ),
                        ],
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
              if (settings.showAccountDetails && settings.bankName != null) ...[
                pw.SizedBox(height: 10),
                pw.Text('Payment Details:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                pw.Text('Bank: ${settings.bankName}'),
                if (settings.accountNumber != null) pw.Text('Acc Number: ${settings.accountNumber}'),
                if (settings.accountName != null) pw.Text('Acc Name: ${settings.accountName}'),
              ],
              
              if (adminSignatureImage != null)
                pw.Padding(
                  padding: const pw.EdgeInsets.only(top: 20),
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.end,
                    children: [
                      pw.Column(
                        children: [
                          pw.Container(
                            height: 60,
                            width: 120,
                            child: pw.Image(adminSignatureImage, fit: pw.BoxFit.contain),
                          ),
                          pw.Container(width: 120, height: 1, color: PdfColors.black),
                          pw.Text('Authorized Signature', style: const pw.TextStyle(fontSize: 10)),
                        ],
                      ),
                    ],
                  ),
                ),

              pw.SizedBox(height: 30),
              pw.Center(
                child: pw.Text(isPro ? '✨ Invify Pro Edition' : 'Powered by IIPS', 
                    style: pw.TextStyle(fontSize: 10, color: isPro ? PdfColors.blue : PdfColors.grey, fontWeight: isPro ? pw.FontWeight.bold : pw.FontWeight.normal)),
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

  Future<Uint8List> _generateSchoolTeal(pw.Document pdf, Invoice invoice, AppSettings settings, pw.ImageProvider? logoImage, pw.ImageProvider? adminSignatureImage, bool useCustomPrices, {String? receiptTitle, UserPlan? userPlan}) async {
    final dateFormat = DateFormat('dd-MM-yyyy');
    final bool isPro = userPlan?.isValid == true && !userPlan!.isBasic;
    const primaryColor = PdfColor.fromInt(0xFF00796B); // Teal 700
    const secondaryColor = PdfColor.fromInt(0xFF455A64); // Blue Grey 700

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(30),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Row(
                    children: [
                      if (logoImage != null)
                        pw.Container(
                          width: 80,
                          height: 80,
                          margin: const pw.EdgeInsets.only(right: 15),
                          child: pw.Image(logoImage),
                        ),
                      pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text(settings.organizationName.toUpperCase(), 
                              style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold, color: primaryColor)),
                          if (settings.businessDescription != null)
                            pw.Text(settings.businessDescription!.toUpperCase(), 
                                style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: secondaryColor)),
                        ],
                      ),
                    ],
                  ),
                  pw.Container(
                    width: 150,
                    height: 100,
                    decoration: const pw.BoxDecoration(
                      color: primaryColor,
                      borderRadius: pw.BorderRadius.only(bottomLeft: pw.Radius.circular(50)),
                    ),
                  ),
                ],
              ),
              pw.SizedBox(height: 30),
              
              pw.Center(
                child: pw.Column(
                  children: [
                    pw.Text(receiptTitle ?? 'FEE RECEIPT', style: pw.TextStyle(fontSize: 32, fontWeight: pw.FontWeight.bold, color: primaryColor)),
                    pw.Container(height: 4, width: 60, color: primaryColor, margin: const pw.EdgeInsets.symmetric(vertical: 5)),
                  ],
                ),
              ),
              pw.SizedBox(height: 20),

              // Info Row
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(settings.businessMode == 'school' ? 'Student Info' : 'Invoice To', style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey)),
                      pw.Text(invoice.customerName ?? (settings.businessMode == 'school' ? 'STUDENT NAME' : 'VALUED CUSTOMER'), style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, color: primaryColor)),
                      pw.Text(invoice.className ?? 'CLASS NAME', style: const pw.TextStyle(fontSize: 12)),
                      if (invoice.customerPhone != null) pw.Text('Phone: ${invoice.customerPhone}', style: const pw.TextStyle(fontSize: 11)),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text('Invoice No: ${invoice.invoiceNumber}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                      pw.Text('Invoice Date: ${dateFormat.format(invoice.dateCreated)}'),
                      if (invoice.termName != null) pw.Text('Term: ${invoice.termName}'),
                      if (invoice.academicYearName != null) pw.Text('Session: ${invoice.academicYearName}'),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 30),

              // Table
              pw.Table(
                border: pw.TableBorder.all(color: PdfColors.black, width: 1),
                columnWidths: {
                  0: const pw.FlexColumnWidth(0.8),
                  1: const pw.FlexColumnWidth(5),
                  2: const pw.FlexColumnWidth(1.5),
                },
                children: [
                  pw.TableRow(
                    decoration: pw.BoxDecoration(color: primaryColor),
                    children: [
                      _schoolHeaderCell('NO.'),
                      _schoolHeaderCell('FEE DESCRIPTION'),
                      _schoolHeaderCell('AMOUNT', align: pw.Alignment.centerRight),
                    ],
                  ),
                  ...invoice.items.asMap().entries.map((entry) {
                    final index = entry.key;
                    final item = entry.value;
                    final usePrint = useCustomPrices && item.printPrice != null;
                    final unitPrice = usePrint ? item.printPrice! : item.unitPrice;
                    return pw.TableRow(
                      children: [
                        _schoolDataCell((index + 1).toString().padLeft(2, '0'), align: pw.Alignment.center),
                        _schoolDataCell(item.item.name),
                        _schoolDataCell(CurrencyFormatter.format(unitPrice), align: pw.Alignment.centerRight),
                      ],
                    );
                  }).toList(),
                  // Filler rows to match style
                  if (invoice.items.length < 7)
                    ...List.generate(7 - invoice.items.length, (i) => pw.TableRow(
                      children: [
                        _schoolDataCell(''),
                        _schoolDataCell(''),
                        _schoolDataCell(''),
                      ],
                    )),
                ],
              ),

              pw.SizedBox(height: 20),

              // Totals part
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  // Payment Info
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Payments Method:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: primaryColor)),
                      pw.Text(invoice.paymentMethod ?? 'N/A'),
                      pw.SizedBox(height: 10),
                      if (settings.showAccountDetails && settings.bankName != null) ...[
                        pw.Text('Account Info:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: primaryColor)),
                        pw.Text('Bank: ${settings.bankName}'),
                        pw.Text('Acc No: ${settings.accountNumber}'),
                        pw.Text('Acc Name: ${settings.accountName}'),
                      ],
                      pw.SizedBox(height: 10),
                      pw.Text('Terms & Conditions:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: primaryColor)),
                      pw.Container(
                        width: 250,
                        child: pw.Text('Fees once paid are non-refundable. Please keep this receipt for future reference.', style: const pw.TextStyle(fontSize: 9)),
                      ),
                    ],
                  ),
                  // Totals
                  pw.Container(
                    width: 240,
                    child: pw.Column(
                      children: [
                        _schoolSummaryRow('Subtotal:', CurrencyFormatter.format(invoice.subtotal)),
                        if (invoice.discountAmount > 0)
                          _schoolSummaryRow('Discount:', '-${CurrencyFormatter.format(invoice.discountAmount)}'),
                        if (invoice.taxAmount > 0)
                          _schoolSummaryRow('Tax (${(settings.taxRate * 100).toStringAsFixed(0)}%):', CurrencyFormatter.format(invoice.taxAmount)),
                        pw.Container(
                          height: 40,
                          margin: const pw.EdgeInsets.only(top: 10),
                          padding: const pw.EdgeInsets.symmetric(horizontal: 10),
                          decoration: pw.BoxDecoration(color: primaryColor),
                          child: pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('TOTAL:', style: pw.TextStyle(color: PdfColors.white, fontWeight: pw.FontWeight.bold, fontSize: 14)),
                              pw.Text('${settings.currency} ${CurrencyFormatter.format(useCustomPrices && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount)}', 
                                  style: pw.TextStyle(color: PdfColors.white, fontWeight: pw.FontWeight.bold, fontSize: 14)),
                            ],
                          ),
                        ),
                        pw.SizedBox(height: 10),
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Container(
                              padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: pw.BoxDecoration(
                                border: pw.Border.all(color: invoice.balanceAmount <= 0 ? PdfColors.green : PdfColors.red, width: 2),
                              ),
                              child: pw.Text(
                                invoice.balanceAmount <= 0 ? 'PAID' : 'BALANCE DUE',
                                style: pw.TextStyle(
                                  color: invoice.balanceAmount <= 0 ? PdfColors.green : PdfColors.red,
                                  fontWeight: pw.FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                            pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.end,
                              children: [
                                _schoolSummaryRow('PAID AMOUNT:', CurrencyFormatter.format(invoice.amountPaid)),
                                _schoolSummaryRow('Due:', CurrencyFormatter.format(invoice.balanceAmount)),
                              ],
                            ),
                          ],
                        ),
                        pw.SizedBox(height: 10),
                        pw.Align(
                          alignment: pw.Alignment.centerRight,
                          child: pw.Text(
                            'Amount in Words: ${NumberToWords.convert(
                              useCustomPrices && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount,
                              currency: settings.currencyName,
                              subunit: settings.currencySubunit,
                            )}',
                            style: pw.TextStyle(fontSize: 10, fontStyle: pw.FontStyle.italic, fontWeight: pw.FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              pw.Spacer(),
              pw.Divider(color: primaryColor, thickness: 5),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                   pw.Text(isPro ? '✨ Invify Pro Edition' : 'Powered by IIPS', 
                       style: pw.TextStyle(fontSize: 8, color: isPro ? PdfColors.blue : PdfColors.grey, fontWeight: isPro ? pw.FontWeight.bold : pw.FontWeight.normal)),
                   pw.Text(settings.address, style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey)),
                ],
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  pw.Widget _schoolHeaderCell(String text, {pw.Alignment align = pw.Alignment.centerLeft}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(8),
      child: pw.Align(
        alignment: align,
        child: pw.Text(text, style: pw.TextStyle(color: PdfColors.white, fontWeight: pw.FontWeight.bold, fontSize: 10)),
      ),
    );
  }

  pw.Widget _schoolDataCell(String text, {pw.Alignment align = pw.Alignment.centerLeft}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(8),
      child: pw.Align(
        alignment: align,
        child: pw.Text(text, style: const pw.TextStyle(fontSize: 10)),
      ),
    );
  }

  pw.Widget _schoolSummaryRow(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 4),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(label, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
          pw.Text(value),
        ],
      ),
    );
  }

  Future<Uint8List> _generateSchoolColor(pw.Document pdf, Invoice invoice, AppSettings settings, pw.ImageProvider? logoImage, pw.ImageProvider? adminSignatureImage, bool useCustomPrices, {String? receiptTitle, UserPlan? userPlan}) async {
    // Uses the primary color from settings for a branded look
    final dateFormat = DateFormat('dd-MM-yyyy');
    final bool isPro = userPlan?.isValid == true && !userPlan!.isBasic;
    final primaryColor = PdfColor.fromInt(settings.primaryColor);
    final accentColor = PdfColors.grey100;

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(30),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
               // Colored header bar
              pw.Container(
                height: 20,
                width: double.infinity,
                color: PdfColors.black,
              ),
              pw.Container(
                height: 60,
                width: double.infinity,
                color: primaryColor,
              ),
              pw.SizedBox(height: 20),

              // Header Content
              pw.Row(
                children: [
                  if (logoImage != null)
                    pw.Container(
                      width: 80,
                      height: 80,
                      margin: const pw.EdgeInsets.only(right: 15),
                      child: pw.Image(logoImage),
                    ),
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(settings.organizationName.toUpperCase(), 
                            style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold, color: primaryColor)),
                        if (settings.businessDescription != null)
                          pw.Text(settings.businessDescription!.toUpperCase(), 
                              style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: PdfColors.grey700)),
                      ],
                    ),
                  ),
                ],
              ),
              pw.SizedBox(height: 40),

              pw.Text(receiptTitle ?? 'FEE RECEIPT', style: pw.TextStyle(fontSize: 42, fontWeight: pw.FontWeight.bold, color: primaryColor)),
              pw.Container(height: 6, width: 80, color: primaryColor, margin: const pw.EdgeInsets.only(top: 5, bottom: 30)),

              // Info Box
              pw.Row(
                 mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                 crossAxisAlignment: pw.CrossAxisAlignment.start,
                 children: [
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(settings.businessMode == 'school' ? 'Student Info' : 'Invoice To', style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey)),
                        pw.Text(invoice.customerName ?? 'STUDENT NAME', style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold, color: primaryColor)),
                        pw.Text(invoice.className ?? 'CLASS NAME', style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold)),
                        if (invoice.customerPhone != null) pw.Text('Phone: ${invoice.customerPhone}'),
                      ],
                    ),
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Text('Invoice No: ${invoice.invoiceNumber}', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold)),
                        pw.Text('Invoice Date: ${dateFormat.format(invoice.dateCreated)}', style: pw.TextStyle(fontSize: 11)),
                        if (invoice.termName != null) pw.Text('Term: ${invoice.termName}', style: pw.TextStyle(fontSize: 11)),
                        if (invoice.academicYearName != null) pw.Text('Session: ${invoice.academicYearName}', style: pw.TextStyle(fontSize: 11)),
                      ],
                    ),
                 ],
              ),
              pw.SizedBox(height: 30),

              // Table
              pw.Table(
                border: pw.TableBorder.all(color: primaryColor, width: 1),
                columnWidths: {
                  0: const pw.FlexColumnWidth(0.8),
                  1: const pw.FlexColumnWidth(5),
                  2: const pw.FlexColumnWidth(1.5),
                },
                children: [
                  pw.TableRow(
                    decoration: pw.BoxDecoration(color: primaryColor),
                    children: [
                      _schoolHeaderCell('NO.'),
                      _schoolHeaderCell('FEE DESCRIPTION'),
                      _schoolHeaderCell('AMOUNT', align: pw.Alignment.centerRight),
                    ],
                  ),
                  ...invoice.items.asMap().entries.map((entry) {
                    final index = entry.key;
                    final item = entry.value;
                    final usePrint = useCustomPrices && item.printPrice != null;
                    final unitPrice = usePrint ? item.printPrice! : item.unitPrice;
                    return pw.TableRow(
                      decoration: index % 2 == 1 ? pw.BoxDecoration(color: accentColor) : null,
                      children: [
                        _schoolDataCell((index + 1).toString().padLeft(2, '0'), align: pw.Alignment.center),
                        _schoolDataCell(item.item.name),
                        _schoolDataCell(CurrencyFormatter.format(unitPrice), align: pw.Alignment.centerRight),
                      ],
                    );
                  }).toList(),
                  // Filler rows
                  if (invoice.items.length < 7)
                    ...List.generate(7 - invoice.items.length, (i) => pw.TableRow(
                      decoration: (i + invoice.items.length) % 2 == 1 ? pw.BoxDecoration(color: accentColor) : null,
                      children: [
                        _schoolDataCell(''),
                        _schoolDataCell(''),
                        _schoolDataCell(''),
                      ],
                    )),
                ],
              ),

              pw.SizedBox(height: 20),

              // Totals part
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                   pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Payments Method:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: primaryColor)),
                      pw.Text(invoice.paymentMethod ?? 'N/A'),
                      pw.SizedBox(height: 10),
                      if (settings.showAccountDetails && settings.bankName != null) ...[
                        pw.Text('Account Info:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: primaryColor)),
                        pw.Text('Bank: ${settings.bankName}'),
                        pw.Text('Acc No: ${settings.accountNumber}'),
                        pw.Text('Acc Name: ${settings.accountName}'),
                        pw.SizedBox(height: 10),
                      ],
                      pw.Text('Terms & Conditions:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: primaryColor)),
                      pw.Container(
                        width: 250,
                        child: pw.Text('Fees once paid are non-refundable. All balances should be cleared before terminal exams.', style: const pw.TextStyle(fontSize: 9)),
                      ),
                    ],
                  ),
                  pw.Container(
                    width: 240,
                    child: pw.Column(
                      children: [
                        _schoolSummaryRow('Subtotal:', CurrencyFormatter.format(invoice.subtotal)),
                        if (invoice.discountAmount > 0)
                          pw.Container(
                            color: accentColor,
                            child: _schoolSummaryRow('Discount:', '-${CurrencyFormatter.format(invoice.discountAmount)}'),
                          ),
                        pw.SizedBox(height: 5),
                        _schoolSummaryRow('VAT Tax (0%):', CurrencyFormatter.format(invoice.taxAmount)),
                        pw.Container(
                          height: 40,
                          margin: const pw.EdgeInsets.only(top: 10),
                          padding: const pw.EdgeInsets.symmetric(horizontal: 10),
                          decoration: pw.BoxDecoration(color: primaryColor),
                          child: pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('TOTAL:', style: pw.TextStyle(color: PdfColors.white, fontWeight: pw.FontWeight.bold, fontSize: 14)),
                              pw.Text('${settings.currency} ${CurrencyFormatter.format(useCustomPrices && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount)}', 
                                  style: pw.TextStyle(color: PdfColors.white, fontWeight: pw.FontWeight.bold, fontSize: 14)),
                            ],
                          ),
                        ),
                        pw.SizedBox(height: 10),
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Container(
                              padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: pw.BoxDecoration(
                                border: pw.Border.all(color: invoice.balanceAmount <= 0 ? PdfColors.green : PdfColors.red, width: 2),
                              ),
                              child: pw.Text(
                                invoice.balanceAmount <= 0 ? 'PAID' : 'BALANCE DUE',
                                style: pw.TextStyle(
                                  color: invoice.balanceAmount <= 0 ? PdfColors.green : PdfColors.red,
                                  fontWeight: pw.FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                            pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.end,
                              children: [
                                _schoolSummaryRow('PAID AMOUNT:', CurrencyFormatter.format(invoice.amountPaid)),
                                _schoolSummaryRow('Due:', CurrencyFormatter.format(invoice.balanceAmount)),
                              ],
                            ),
                          ],
                        ),
                        pw.SizedBox(height: 10),
                        pw.Align(
                          alignment: pw.Alignment.centerRight,
                          child: pw.Text(
                            'Amount in Words: ${NumberToWords.convert(
                              useCustomPrices && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount,
                              currency: settings.currencyName,
                              subunit: settings.currencySubunit,
                            )}',
                            style: pw.TextStyle(fontSize: 10, fontStyle: pw.FontStyle.italic, fontWeight: pw.FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              pw.Spacer(),
              pw.Container(
                 height: 40,
                 width: double.infinity,
                 decoration: const pw.BoxDecoration(
                   color: PdfColors.black,
                   borderRadius: pw.BorderRadius.only(topLeft: pw.Radius.circular(40)),
                 ),
                  alignment: pw.Alignment.centerRight,
                  padding: const pw.EdgeInsets.symmetric(horizontal: 20),
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                       pw.Text(isPro ? '✨ Invify Pro Edition' : 'Powered by IIPS', 
                           style: pw.TextStyle(color: isPro ? PdfColors.blue100 : PdfColors.white, fontSize: 8, fontWeight: isPro ? pw.FontWeight.bold : pw.FontWeight.normal)),
                       pw.Text('www.involve.com', style: const pw.TextStyle(color: PdfColors.white, fontSize: 8)),
                    ],
                  ),
               ),
              pw.Container(
                height: 10,
                width: double.infinity,
                color: primaryColor,
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  Future<Uint8List> _generateSchoolAcademic(pw.Document pdf, Invoice invoice, AppSettings settings, pw.ImageProvider? logoImage, pw.ImageProvider? adminSignatureImage, bool useCustomPrices, {String? receiptTitle, UserPlan? userPlan}) async {
    // Matches university style media__1772443499936.png
    final dateFormat = DateFormat('dd/MM/yyyy');
    final bool isPro = userPlan?.isValid == true && !userPlan!.isBasic;
    
    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              if (logoImage != null)
                pw.Image(logoImage, height: 80),
              pw.SizedBox(height: 10),
              pw.Text(settings.organizationName.toUpperCase(), 
                  style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
              pw.Text(receiptTitle ?? 'OFFICIAL FEE RECEIPT', 
                  style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 20),
              pw.Container( // This was missing in the original code
                width: 70,
                height: 80,
                decoration: pw.BoxDecoration(
                  border: pw.Border.all(color: PdfColors.grey300),
                ),
                alignment: pw.Alignment.center,
                child: invoice.studentImage != null 
                  ? pw.Image(pw.MemoryImage(invoice.studentImage!), fit: pw.BoxFit.cover)
                  : pw.Text('PHOTO', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey300)),
              ),
              pw.SizedBox(height: 30),

              // Student Details List
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.start,
                children: [
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        _academicInfoRow('ADM NO:', invoice.admissionNumber ?? 'N/A'),
                        _academicInfoRow('NAME:', invoice.customerName?.toUpperCase() ?? 'N/A'),
                        _academicInfoRow('CLASS:', invoice.className?.toUpperCase() ?? 'N/A'),
                        if (invoice.termName != null) _academicInfoRow('TERM:', invoice.termName!.toUpperCase()),
                      ],
                    ),
                  ),
                ],
              ),
              pw.SizedBox(height: 20),

              // Table
              pw.Table(
                border: pw.TableBorder(
                  horizontalInside: const pw.BorderSide(color: PdfColors.black, width: 0.5, style: pw.BorderStyle.dashed),
                  top: const pw.BorderSide(color: PdfColors.black, width: 1.5),
                  bottom: const pw.BorderSide(color: PdfColors.black, width: 1.5),
                  left: const pw.BorderSide(color: PdfColors.black, width: 1),
                  right: const pw.BorderSide(color: PdfColors.black, width: 1),
                  verticalInside: const pw.BorderSide(color: PdfColors.black, width: 1),
                ),
                columnWidths: {
                  0: const pw.FixedColumnWidth(30),
                  1: const pw.FlexColumnWidth(4),
                  2: const pw.FixedColumnWidth(80),
                  3: const pw.FixedColumnWidth(80),
                },
                children: [
                   pw.TableRow(
                    children: [
                      _academicCell('', align: pw.Alignment.center),
                      _academicCell('FEE TYPE', isBold: true, align: pw.Alignment.center),
                      _academicCell('CODE', isBold: true, align: pw.Alignment.center),
                      _academicCell('AMOUNT (=${settings.currency})', isBold: true, align: pw.Alignment.center),
                    ],
                  ),
                  ...invoice.items.asMap().entries.map((entry) {
                    final index = entry.key;
                    final item = entry.value;
                    final usePrint = useCustomPrices && item.printPrice != null;
                    final unitPrice = usePrint ? item.printPrice! : item.unitPrice;
                    return pw.TableRow(
                      children: [
                        _academicCell((index + 1).toString(), align: pw.Alignment.center),
                        _academicCell(item.item.name),
                        _academicCell(''),
                        _academicCell(CurrencyFormatter.format(unitPrice), align: pw.Alignment.centerRight),
                      ],
                    );
                  }).toList(),
                  // Totals in table
                  pw.TableRow(
                    children: [
                      _academicCell(''),
                      _academicCell(''),
                      _academicCell('EXPECTED AMOUNT', isBold: true, align: pw.Alignment.centerRight),
                      _academicCell(CurrencyFormatter.format(useCustomPrices && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount), isBold: true, align: pw.Alignment.centerRight),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 20),

              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.end,
                children: [
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        _academicSimpleRow('The total sum of:', NumberToWords.convert(
                          useCustomPrices && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount,
                          currency: settings.currencyName,
                          subunit: settings.currencySubunit,
                        )),
                        _academicSimpleRow('Being payment for:', '${invoice.termName ?? "Fees"} - ${invoice.academicYearName ?? ""}'),
                        _academicSimpleRow('Receipt printed on:', dateFormat.format(DateTime.now())),
                        if (settings.showAccountDetails && settings.bankName != null) ...[
                          pw.SizedBox(height: 10),
                          pw.Text('PAYMENT DETAILS:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                          pw.Text('Bank: ${settings.bankName} | Acc No: ${settings.accountNumber} | Acc Name: ${settings.accountName}', 
                              style: const pw.TextStyle(fontSize: 10)),
                        ],
                      ],
                    ),
                  ),
                  pw.SizedBox(width: 20),
                  pw.Container(
                    width: 150,
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Container(
                          padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: pw.BoxDecoration(
                            border: pw.Border.all(color: invoice.balanceAmount <= 0 ? PdfColors.green : PdfColors.red, width: 1),
                          ),
                          child: pw.Text(
                            invoice.balanceAmount <= 0 ? 'PAID' : 'BALANCE DUE',
                            style: pw.TextStyle(
                              color: invoice.balanceAmount <= 0 ? PdfColors.green : PdfColors.red,
                              fontWeight: pw.FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        pw.SizedBox(height: 5),
                        pw.Text('PAID AMOUNT: ${settings.currency} ${CurrencyFormatter.format(invoice.amountPaid)}', style: const pw.TextStyle(fontSize: 10)),
                        pw.Text('Due: ${settings.currency} ${CurrencyFormatter.format(invoice.balanceAmount)}', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: invoice.balanceAmount > 0 ? PdfColors.red : PdfColors.black)),
                      ],
                    ),
                  ),
                ],
              ),

              pw.Spacer(),
              // Barcode placeholder
              pw.BarcodeWidget(
                data: invoice.invoiceNumber,
                barcode: pw.Barcode.code128(),
                width: 200,
                height: 40,
              ),
              pw.Text(invoice.invoiceNumber, style: const pw.TextStyle(fontSize: 8)),
              pw.SizedBox(height: 10),
              pw.Center(
                child: pw.Text(isPro ? '✨ Invify Pro Edition' : 'Powered by IIPS', 
                    style: pw.TextStyle(fontSize: 10, color: isPro ? PdfColors.blue : PdfColors.grey, fontWeight: isPro ? pw.FontWeight.bold : pw.FontWeight.normal)),
              ),
              pw.SizedBox(height: 10),
              if (adminSignatureImage != null)
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.end,
                  children: [
                    pw.Column(
                      children: [
                        pw.Container(
                          height: 50,
                          width: 100,
                          child: pw.Image(adminSignatureImage),
                        ),
                        pw.Container(width: 120, height: 1, color: PdfColors.black),
                        pw.Text('Authorized Designatory', style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold)),
                      ],
                    ),
                    pw.SizedBox(width: 40),
                  ],
                ),
              pw.SizedBox(height: 10),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  pw.Widget _academicInfoRow(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Container(width: 100, child: pw.Text(label, style: const pw.TextStyle(fontSize: 12))),
          pw.Expanded(
            child: pw.Text(value, style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold, decoration: pw.TextDecoration.underline)),
          ),
        ],
      ),
    );
  }

  pw.Widget _academicCell(String text, {bool isBold = false, pw.Alignment align = pw.Alignment.centerLeft}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      child: pw.Align(
        alignment: align,
        child: pw.Text(text, style: pw.TextStyle(fontSize: 10, fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal)),
      ),
    );
  }

  pw.Widget _academicSimpleRow(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 4),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
           pw.Text(label, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
           pw.SizedBox(width: 8),
           pw.Expanded(
             child: pw.Text(value, style: pw.TextStyle(fontSize: 10, fontStyle: pw.FontStyle.italic, decoration: pw.TextDecoration.underline)),
           ),
        ],
      ),
    );
  }

  Future<Uint8List> _generateSchoolTraditional(pw.Document pdf, Invoice invoice, AppSettings settings, pw.ImageProvider? logoImage, pw.ImageProvider? adminSignatureImage, bool useCustomPrices, {String? receiptTitle, UserPlan? userPlan}) async {
    // Matches horizontal voucher style media__1772443609175.png
    final dateFormat = DateFormat('dd/MM/yyyy');
    final bool isPro = userPlan?.isValid == true && !userPlan!.isBasic;
    const greenTheme = PdfColor.fromInt(0xFF2E7D32); // Green 800

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4.landscape,
        margin: const pw.EdgeInsets.all(30),
        build: (pw.Context context) {
          return pw.Container(
            padding: const pw.EdgeInsets.all(20),
            decoration: pw.BoxDecoration(
              border: pw.Border.all(color: greenTheme, width: 2),
              borderRadius: const pw.BorderRadius.all(pw.Radius.circular(20)),
            ),
            child: pw.Row(
              children: [
                // Left Logo Part
                pw.Container(
                  width: 150,
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.center,
                    children: [
                       if (logoImage != null)
                        pw.Image(logoImage, height: 80),
                      pw.SizedBox(height: 10),
                      pw.Text(settings.organizationName.toUpperCase(), 
                          textAlign: pw.TextAlign.center,
                          style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, color: greenTheme)),
                      pw.Text(settings.address, textAlign: pw.TextAlign.center, style: const pw.TextStyle(fontSize: 8)),
                      pw.Text('Tel: ${settings.phone}', style: const pw.TextStyle(fontSize: 8)),
                      pw.Spacer(),
                      pw.Transform.rotate(
                        angle: -1.57,
                        child: pw.Text(receiptTitle ?? 'Payment Receipt', style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold, color: const PdfColor.fromInt(0x332E7D32))),
                      ),
                    ],
                  ),
                ),
                pw.VerticalDivider(color: greenTheme),
                pw.SizedBox(width: 20),
                
                // Right Content Part
                pw.Expanded(
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Row(
                        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                        children: [
                           pw.Container(
                             padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                             decoration: const pw.BoxDecoration(color: greenTheme),
                             child: pw.Text(receiptTitle ?? 'Payment Receipt', style: pw.TextStyle(color: PdfColors.white, fontWeight: pw.FontWeight.bold)),
                           ),
                           pw.Container(
                              padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: pw.BoxDecoration(
                                border: pw.Border.all(color: invoice.balanceAmount <= 0 ? PdfColors.green : PdfColors.red, width: 2),
                              ),
                              child: pw.Text(
                                invoice.balanceAmount <= 0 ? 'STATUS: PAID' : 'STATUS: UNPAID',
                                style: pw.TextStyle(
                                  color: invoice.balanceAmount <= 0 ? PdfColors.green : PdfColors.red,
                                  fontWeight: pw.FontWeight.bold,
                                ),
                              ),
                            ),
                           pw.Row(
                             children: [
                                pw.Text('Date: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                                pw.Text(dateFormat.format(invoice.dateCreated), style: const pw.TextStyle(decoration: pw.TextDecoration.underline)),
                             ],
                           ),
                        ],
                      ),
                      pw.SizedBox(height: 30),
                      
                      _voucherRow('Received from', invoice.customerName?.toUpperCase() ?? 'N/A'),
                       _voucherRow('The sum of', NumberToWords.convert(
                        useCustomPrices && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount,
                        currency: settings.currencyName,
                        subunit: settings.currencySubunit,
                      )),
                      _voucherRow('Being Payment for', '${invoice.items.first.item.name} for ${invoice.className ?? "Class"}'),
                      
                      pw.SizedBox(height: 30),
                      pw.Row(
                        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                        children: [
                          pw.Column(
                             crossAxisAlignment: pw.CrossAxisAlignment.start,
                             children: [
                               pw.Text('Cash/Cheque No: ${invoice.paymentMethod ?? "_________________"}'),
                               pw.SizedBox(height: 20),
                                pw.Row(
                                  children: [
                                    pw.Text('PAID AMOUNT ${settings.currency}: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: greenTheme)),
                                    pw.Text(CurrencyFormatter.format(invoice.amountPaid)),
                                  ],
                                ),
                                pw.Row(
                                  children: [
                                    pw.Text('BALANCE ${settings.currency}: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: greenTheme)),
                                    pw.Text(CurrencyFormatter.format(invoice.balanceAmount)),
                                  ],
                                ),
                             ],
                          ),
                          if (settings.showAccountDetails && settings.bankName != null) ...[
                            pw.SizedBox(width: 10),
                            pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.start,
                              children: [
                                pw.Text('PAYMENT DETAILS:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: greenTheme, fontSize: 9)),
                                pw.Text('Bank: ${settings.bankName}', style: const pw.TextStyle(fontSize: 8)),
                                pw.Text('Acc No: ${settings.accountNumber}', style: const pw.TextStyle(fontSize: 8)),
                                pw.Text('Acc Name: ${settings.accountName}', style: const pw.TextStyle(fontSize: 8)),
                              ],
                            ),
                          ],
                          pw.Spacer(),
                          pw.Column(
                             children: [
                               if (isPro)
                                 pw.Padding(
                                   padding: const pw.EdgeInsets.only(bottom: 10),
                                   child: pw.Text('✨ Invify Pro Edition', style: pw.TextStyle(fontSize: 8, color: PdfColors.blue, fontWeight: pw.FontWeight.bold)),
                                 ),
                               pw.Container(
                                 padding: const pw.EdgeInsets.all(10),
                                 decoration: pw.BoxDecoration(border: pw.Border.all(color: greenTheme, width: 2)),
                                 child: pw.Text('${settings.currency} ${CurrencyFormatter.format(useCustomPrices && invoice.totalPrintAmount != null ? invoice.totalPrintAmount! : invoice.totalAmount)}', 
                                     style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold, color: greenTheme)),
                               ),
                               pw.SizedBox(height: 20),
                               pw.Text('FOR: ${settings.organizationName.toUpperCase()}', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold)),
                               if (adminSignatureImage != null)
                                pw.Padding(
                                  padding: const pw.EdgeInsets.only(top: 5),
                                  child: pw.Container(
                                    height: 40,
                                    width: 80,
                                    child: pw.Image(adminSignatureImage),
                                  ),
                                ),
                             ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );

    return pdf.save();
  }

  pw.Widget _voucherRow(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 8),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.end,
        children: [
          pw.Text('$label: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 13)),
          pw.Expanded(
            child: pw.Container(
              decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: PdfColors.black, style: pw.BorderStyle.dotted))),
              child: pw.Text(value, style: pw.TextStyle(fontSize: 14, fontStyle: pw.FontStyle.italic)),
            ),
          ),
        ],
      ),
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
