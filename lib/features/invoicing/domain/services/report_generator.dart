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
import 'package:involve_app/features/invoicing/domain/templates/invoice_template.dart';
import 'package:involve_app/features/invoicing/domain/entities/stock_return.dart';
import 'package:involve_app/features/settings/domain/entities/staff.dart';
import 'package:involve_app/features/stock/domain/entities/expense.dart';
import 'package:collection/collection.dart';

enum ReportType { standard, activity }

class ReportGenerator {
  static Future<pw.Document> buildReport({
    required List<Invoice> invoices,
    required AppSettings settings,
    InvReportDateRange? dateRange,
    List<StockReturn>? stockReturns,
  }) async {
    final font = await PdfGoogleFonts.robotoRegular();
    final boldFont = await PdfGoogleFonts.robotoBold();
    final List<StockReturn> returns = stockReturns ?? [];

    final pdf = pw.Document(
      theme: pw.ThemeData.withFont(
        base: font,
        bold: boldFont,
      ),
    );

    final dateStr = dateRange != null
        ? '${DateFormat('MMM dd, yyyy').format(dateRange.start)} - ${DateFormat('MMM dd, yyyy').format(dateRange.end)}'
        : 'All Time';

    final totalAmount = invoices.fold<double>(0, (sum, item) => sum + item.totalAmount);
    final totalPaid = invoices.fold<double>(0, (sum, item) => sum + item.amountPaid);
    final totalReturned = returns.fold<double>(0, (sum, item) => sum + item.amountReturned);
    // Dynamic balance calculation based on net total in DB
    final totalBalance = (totalAmount - totalPaid).clamp(0.0, double.infinity);

    // Summary by payment method
    final methodSummary = <String, double>{
      'Cash': 0.0,
      'POS': 0.0,
      'Transfer': 0.0,
    };
    for (final invoice in invoices) {
      final method = invoice.paymentMethod ?? 'Other';
      methodSummary[method] = (methodSummary[method] ?? 0.0) + invoice.amountPaid;
    }

    // Prepare table data
    final headers = ['Date', 'Invoice ID', 'Method', 'Total', 'Paid', 'Return', 'Balance'];
    final data = invoices.map((invoice) {
      final invoiceReturns = returns.where((r) => r.invoiceId == invoice.id).fold<double>(0, (s, r) => s + r.amountReturned);
      final dynamicBalance = (invoice.totalAmount - invoice.amountPaid).clamp(0.0, double.infinity);
      
      return [
        DateFormat('MM-dd HH:mm').format(invoice.dateCreated),
        invoice.invoiceNumber,
        invoice.paymentMethod ?? '-',
        CurrencyFormatter.format(invoice.totalAmount),
        CurrencyFormatter.format(invoice.amountPaid),
        invoiceReturns > 0 ? '(${CurrencyFormatter.format(invoiceReturns)})' : '-',
        CurrencyFormatter.format(dynamicBalance),
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
                'SALES INVOICE REPORT',
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
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
              cellStyle: const pw.TextStyle(fontSize: 9),
              headerDecoration: const pw.BoxDecoration(color: PdfColors.grey100),
              cellAlignment: pw.Alignment.centerLeft,
              cellAlignments: {
                3: pw.Alignment.centerRight,
                4: pw.Alignment.centerRight,
                5: pw.Alignment.centerRight,
              },
              columnWidths: {
                0: const pw.FlexColumnWidth(1.8), // Date
                1: const pw.FlexColumnWidth(1.5), // ID
                2: const pw.FlexColumnWidth(1.2), // Method
                3: const pw.FlexColumnWidth(1.5), // Total
                4: const pw.FlexColumnWidth(1.5), // Paid
                5: const pw.FlexColumnWidth(1.5), // Return
                6: const pw.FlexColumnWidth(1.5), // Balance
              },
            ),

            pw.SizedBox(height: 20),

            // Summary Footer
            pw.Divider(),
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('Total Invoices: ${invoices.length}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.end,
                  children: [
                    pw.Text(
                      'PERIOD TOTAL: ${settings.currency} ${CurrencyFormatter.format(totalAmount)}',
                      style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold),
                    ),
                    pw.Text(
                      'TOTAL PAID: ${settings.currency} ${CurrencyFormatter.format(totalPaid)}',
                      style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: PdfColors.green),
                    ),
                    if (totalReturned > 0)
                      pw.Text(
                        'TOTAL RETURNED: ${settings.currency} ${CurrencyFormatter.format(totalReturned)}',
                        style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: PdfColors.orange),
                      ),
                    pw.Text(
                      'NET SALES: ${settings.currency} ${CurrencyFormatter.format(totalPaid - totalReturned)}',
                      style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: _getPrimaryColor(settings)),
                    ),
                    pw.Text(
                      'TOTAL BALANCE: ${settings.currency} ${CurrencyFormatter.format(totalBalance)}',
                      style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: PdfColors.red),
                    ),
                  ],
                ),
              ],
            ),
            pw.SizedBox(height: 30),

            // Payment Summary Section
            pw.Align(
              alignment: pw.Alignment.centerRight,
              child: pw.Container(
                width: 250,
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('PAYMENT SUMMARY (RECEIVED)', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12)),
                  pw.SizedBox(height: 5),
                  pw.Divider(height: 1),
                  ...methodSummary.entries.map((e) => pw.Padding(
                    padding: const pw.EdgeInsets.symmetric(vertical: 2),
                    child: pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text(e.key),
                        pw.Text('${settings.currency} ${CurrencyFormatter.format(e.value)}'),
                      ],
                    ),
                  )).toList(),
                  pw.Divider(height: 1),
                  pw.Padding(
                    padding: const pw.EdgeInsets.symmetric(vertical: 4),
                    child: pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text('CASH IN HAND', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                        pw.Text(
                          '${settings.currency} ${CurrencyFormatter.format(totalPaid)}',
                          style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: _getPrimaryColor(settings)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
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
      final pdf = await buildInventoryPDF(
        reportData: reportData,
        settings: settings,
        dateRange: dateRange,
      );

      final bytes = await pdf.save();

      if (kIsWeb) {
        await Printing.layoutPdf(
          onLayout: (PdfPageFormat format) async => bytes,
          name: 'Inventory_Report_${DateFormat('yyyyMMdd').format(DateTime.now())}.pdf',
        );
      } else {
        await Printing.sharePdf(
          bytes: bytes,
          filename: 'Inventory_Report_${DateFormat('yyyyMMdd').format(DateTime.now())}.pdf',
        );
      }
    } catch (e) {
      rethrow;
    }
  }

  static Future<pw.Document> buildInventoryPDF({
    required List<Map<String, dynamic>> reportData,
    required AppSettings settings,
    InvReportDateRange? dateRange,
  }) async {
    final font = await PdfGoogleFonts.robotoRegular();
    final boldFont = await PdfGoogleFonts.robotoBold();

    final pdf = pw.Document(
      theme: pw.ThemeData.withFont(
        base: font,
        bold: boldFont,
      ),
    );

    final dateStr = dateRange != null
        ? '${DateFormat('MMM dd, yyyy').format(dateRange.start)} - ${DateFormat('MMM dd, yyyy').format(dateRange.end)}'
        : 'Current Status';

    final headers = ['Product', 'Price', 'Stock', 'Sold', 'Revenue'];
    final data = reportData.map((item) {
      return [
        item['name'].toString(),
        CurrencyFormatter.formatWithSymbol(item['price'], symbol: settings.currency),
        item['stockQty'].toString(),
        item['totalSold'].toString(),
        CurrencyFormatter.formatWithSymbol(item['totalRevenue'], symbol: settings.currency),
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
                'INVENTORY STATUS REPORT',
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

            // Table
            pw.Table.fromTextArray(
              headers: headers,
              data: data,
              border: pw.TableBorder.all(color: PdfColors.grey300),
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
              headerDecoration: const pw.BoxDecoration(color: PdfColors.grey100),
              cellAlignment: pw.Alignment.centerLeft,
              cellAlignments: {
                1: pw.Alignment.centerRight,
                2: pw.Alignment.centerRight,
                3: pw.Alignment.centerRight,
                4: pw.Alignment.centerRight,
              },
              columnWidths: {
                0: const pw.FlexColumnWidth(3.0), // Product
                1: const pw.FlexColumnWidth(1.5), // Price
                2: const pw.FlexColumnWidth(1.2), // Stock
                3: const pw.FlexColumnWidth(1.2), // Sold
                4: const pw.FlexColumnWidth(2.0), // Revenue
              },
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

  static Future<void> exportInventoryCSV({
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

  static List<PrintCommand> buildInventoryThermalCommands({
    required List<Map<String, dynamic>> reportData,
    required AppSettings settings,
    InvReportDateRange? dateRange,
  }) {
    final commands = <PrintCommand>[];

    // Logo (if enabled)
    if (settings.showLogo && settings.logo != null) {
      commands.add(ImageCommand(bytes: settings.logo!));
    }

    // Header
    commands.add(TextCommand(settings.organizationName.toUpperCase(), isBold: true, align: 'center'));
    if (settings.address.isNotEmpty) commands.add(TextCommand(settings.address, align: 'center'));
    commands.add(DividerCommand());
    
    commands.add(TextCommand('INVENTORY REPORT', isBold: true, align: 'center'));
    if (dateRange != null) {
      commands.add(TextCommand(
        '${DateFormat('MMM dd').format(dateRange.start)} - ${DateFormat('MMM dd').format(dateRange.end)}',
        align: 'center',
      ));
    } else {
      commands.add(TextCommand('As of: ${DateFormat('yyyy-MM-dd HH:mm').format(DateTime.now())}', align: 'center'));
    }
    commands.add(DividerCommand());

    // Table Header
    // Column specs: ITEM(8), QTY(5), SOLD(7), REV(12) = 32 chars
    commands.add(TextCommand('ITEM     QTY   SOLD     REV', isBold: true));
    commands.add(DividerCommand());

    // Rows
    for (final item in reportData) {
      final name = item['name'].toString();
      final qty = item['stockQty'].toString();
      final sold = item['totalSold'].toString();
      final rev = CurrencyFormatter.format(item['totalRevenue']).split('.')[0]; 

      final nameTrunc = name.length > 8 ? name.substring(0, 8) : name.padRight(8);
      final qtyPad = qty.padLeft(5);
      final soldPad = sold.padLeft(7);
      final revPad = rev.padLeft(12);
      
      commands.add(TextCommand('$nameTrunc$qtyPad$soldPad$revPad'));
    }

    commands.add(DividerCommand());
    commands.add(TextCommand('Generated by Sales Involve', align: 'center'));
    commands.add(SizedBoxCommand(height: 3));

    return commands;
  }

  static Future<pw.Document> buildActivityReport({
    required List<Invoice> invoices,
    required List<StockReturn> stockReturns,
    required AppSettings settings,
    required List<Staff> staffList,
    InvReportDateRange? dateRange,
  }) async {
    final font = await PdfGoogleFonts.robotoRegular();
    final boldFont = await PdfGoogleFonts.robotoBold();

    final pdf = pw.Document(
      theme: pw.ThemeData.withFont(
        base: font,
        bold: boldFont,
      ),
    );

    final dateStr = dateRange != null
        ? '${DateFormat('MMM dd, yyyy').format(dateRange.start)} - ${DateFormat('MMM dd, yyyy').format(dateRange.end)}'
        : 'All Time';

    // 1. Prepare Activity Stream
    final List<_ActivityEvent> events = [];

    // Add Sales
    for (final inv in invoices) {
      final staff = staffList.cast<Staff?>().firstWhere((s) => s?.id == inv.staffId, orElse: () => null);
      events.add(_ActivityEvent(
        date: inv.dateCreated,
        invoiceNumber: inv.invoiceNumber,
        type: 'SALE',
        details: inv.items.where((i) => !i.isReplacement).map((i) => '${i.item.name} (${i.quantity})').join(', '),
        amount: inv.items.where((i) => !i.isReplacement).fold(0.0, (sum, i) => sum + i.total),
        staff: staff?.name ?? 'ID: ${inv.staffId}',
      ));

      // Add Replacements separately if they exist
      final replacements = inv.items.where((i) => i.isReplacement).toList();
      if (replacements.isNotEmpty) {
        final returnDates = stockReturns.where((r) => r.invoiceId == inv.id).map((r) => r.dateReturned).toSet().toList();
        returnDates.sort((a, b) => b.compareTo(a));
        
        final repDate = returnDates.isNotEmpty ? returnDates.first : inv.dateCreated;

        events.add(_ActivityEvent(
          date: repDate,
          invoiceNumber: inv.invoiceNumber,
          type: 'EXCHANGE',
          details: replacements.map((i) => '${i.item.name} (${i.quantity})').join(', '),
          amount: replacements.fold(0.0, (sum, i) => sum + i.total),
          staff: staff?.name ?? 'ID: ${inv.staffId}',
        ));
      }
    }

    // Add Returns
    for (final ret in stockReturns) {
      final inv = invoices.cast<Invoice?>().firstWhere((i) => i?.id == ret.invoiceId, orElse: () => null);
      final staff = staffList.cast<Staff?>().firstWhere((s) => s?.id == ret.staffId, orElse: () => null);
      
      String itemName = 'Unknown Item';
      if (inv != null) {
        final item = inv.items.cast<InvoiceItem?>().firstWhere((i) => i?.item.id == ret.itemId, orElse: () => null);
        if (item != null) itemName = item.item.name;
      }

      events.add(_ActivityEvent(
        date: ret.dateReturned,
        invoiceNumber: inv?.invoiceNumber ?? 'ID: ${ret.invoiceId}',
        type: 'RETURN',
        details: '$itemName (${ret.quantity})',
        amount: -ret.amountReturned,
        staff: staff?.name ?? 'ID: ${ret.staffId}',
      ));
    }

    // Sort events chronologically
    events.sort((a, b) => a.date.compareTo(b.date));

    // 2. Format Table Data
    final headers = ['Time', 'Invoice #', 'Action', 'Details', 'Amount', 'Staff'];
    final data = events.map((e) => [
      DateFormat('MM-dd HH:mm').format(e.date),
      e.invoiceNumber,
      e.type,
      e.details,
      CurrencyFormatter.format(e.amount),
      e.staff,
    ]).toList();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4.landscape,
        margin: const pw.EdgeInsets.all(32),
        header: (context) => pw.Column(
          children: [
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(settings.organizationName.toUpperCase(), style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
                pw.Text('DETAILED SALES ACTIVITY LOG', style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, color: _getPrimaryColor(settings))),
                pw.Text(dateStr, style: const pw.TextStyle(fontSize: 10)),
              ],
            ),
            pw.SizedBox(height: 10),
            pw.Divider(),
            pw.SizedBox(height: 10),
          ],
        ),
        build: (context) => [
          pw.Table.fromTextArray(
            headers: headers,
            data: data,
            border: pw.TableBorder.all(color: PdfColors.grey300),
            headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
            cellStyle: const pw.TextStyle(fontSize: 9),
            headerDecoration: const pw.BoxDecoration(color: PdfColors.grey100),
            cellAlignment: pw.Alignment.centerLeft,
            cellAlignments: {
              4: pw.Alignment.centerRight,
            },
            columnWidths: {
              0: const pw.FlexColumnWidth(1.2), // Time
              1: const pw.FlexColumnWidth(1.2), // Invoice #
              2: const pw.FlexColumnWidth(1.0), // Action
              3: const pw.FlexColumnWidth(3.0), // Details
              4: const pw.FlexColumnWidth(1.2), // Amount
              5: const pw.FlexColumnWidth(1.2), // Staff
            },
          ),
        ],
        footer: (context) => pw.Align(
          alignment: pw.Alignment.centerRight,
          child: pw.Text('Page ${context.pageNumber} of ${context.pagesCount}', style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey500)),
        ),
      ),
    );

    return pdf;
  }

  static Future<pw.Document> buildProfitReportPDF({
    required List<Map<String, dynamic>> report,
    required double totalExpenses,
    required List<Expense> expenses,
    required AppSettings settings,
    required DateTime start,
    required DateTime end,
  }) async {
    final font = await PdfGoogleFonts.robotoRegular();
    final boldFont = await PdfGoogleFonts.robotoBold();
    final currencySymbol = settings.currency;

    final pdf = pw.Document(
      theme: pw.ThemeData.withFont(
        base: font,
        bold: boldFont,
      ),
    );

    double totalGrossProfit = report.fold(0.0, (sum, item) => sum + (item['totalProfit'] as num).toDouble());
    final netProfit = totalGrossProfit - totalExpenses;

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) => [
          pw.Header(
            level: 0,
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('Profit Report', style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold)),
                pw.Text('${DateFormat('dd/MM/yyyy').format(start)} - ${DateFormat('dd/MM/yyyy').format(end)}'),
              ],
            ),
          ),
          pw.Text(settings.organizationName, style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 20),
          pw.Container(
            padding: const pw.EdgeInsets.all(10),
            decoration: const pw.BoxDecoration(color: PdfColors.grey200),
            child: pw.Column(
              children: [
                _buildPdfSummaryRow('Gross Profit:', totalGrossProfit, currencySymbol),
                _buildPdfSummaryRow('Total Expenses:', -totalExpenses, currencySymbol),
                pw.Divider(),
                _buildPdfSummaryRow('Net Profit:', netProfit, currencySymbol, isBold: true),
              ],
            ),
          ),
          pw.SizedBox(height: 20),
          pw.Text('Item Breakdown', style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
          pw.Divider(),
          pw.Table.fromTextArray(
            headers: ['Item', 'Qty', 'Price', 'Cost', 'Profit'],
            data: report.map((item) => [
              item['name'],
              item['totalSold'].toString(),
              CurrencyFormatter.formatWithSymbol(item['price'], symbol: currencySymbol),
              CurrencyFormatter.formatWithSymbol(item['costPrice'], symbol: currencySymbol),
              CurrencyFormatter.formatWithSymbol(item['totalProfit'], symbol: currencySymbol),
            ]).toList(),
            headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
            cellAlignment: pw.Alignment.centerLeft,
            cellAlignments: {
              2: pw.Alignment.centerRight,
              3: pw.Alignment.centerRight,
              4: pw.Alignment.centerRight,
            },
          ),
        ],
      ),
    );

    return pdf;
  }

  static pw.Widget _buildPdfSummaryRow(String label, double value, String currency, {bool isBold = false}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 4),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(label, style: pw.TextStyle(fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal)),
          pw.Text(CurrencyFormatter.formatWithSymbol(value, symbol: currency), style: pw.TextStyle(fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal)),
        ],
      ),
    );
  }

  static List<PrintCommand> buildProfitThermalCommands({
    required List<Map<String, dynamic>> report,
    required double totalExpenses,
    required AppSettings settings,
    required DateTime start,
    required DateTime end,
  }) {
    final commands = <PrintCommand>[];
    final currencySymbol = settings.currency;

    commands.add(TextCommand('PROFIT REPORT', isBold: true, align: 'center'));
    commands.add(TextCommand('${DateFormat('dd/MM').format(start)} - ${DateFormat('dd/MM').format(end)}', align: 'center'));
    commands.add(DividerCommand());
    commands.add(TextCommand(settings.organizationName.toUpperCase(), align: 'center'));
    commands.add(SizedBoxCommand(height: 1));

    double gross = report.fold(0.0, (sum, i) => sum + (i['totalProfit'] as num).toDouble());
    
    commands.add(TextCommand('Gross: ${CurrencyFormatter.formatWithSymbol(gross, symbol: currencySymbol)}'));
    commands.add(TextCommand('Exp:   ${CurrencyFormatter.formatWithSymbol(-totalExpenses, symbol: currencySymbol)}'));
    commands.add(DividerCommand());
    commands.add(TextCommand('Net:   ${CurrencyFormatter.formatWithSymbol(gross - totalExpenses, symbol: currencySymbol)}', isBold: true));
    commands.add(SizedBoxCommand(height: 1));

    commands.add(TextCommand('ITEMS:', isBold: true));
    for (final i in report.where((item) => (item['totalSold'] ?? 0) > 0)) {
      commands.add(TextCommand(i['name']));
      commands.add(TextCommand('x${i['totalSold']}   ${CurrencyFormatter.formatWithSymbol(i['totalProfit'], symbol: currencySymbol)}', align: 'right'));
    }

    commands.add(DividerCommand());
    commands.add(TextCommand('Generated by Sales Involve', align: 'center'));
    commands.add(SizedBoxCommand(height: 3));

    return commands;
  }

  static Future<pw.Document> buildExpenseLogsPDF({
    required List<Expense> expenses,
    required AppSettings settings,
    required DateTime start,
    required DateTime end,
  }) async {
    final font = await PdfGoogleFonts.robotoRegular();
    final boldFont = await PdfGoogleFonts.robotoBold();
    final currencySymbol = settings.currency;

    final pdf = pw.Document(
      theme: pw.ThemeData.withFont(
        base: font,
        bold: boldFont,
      ),
    );

    final grouped = groupBy(expenses, (Expense e) {
      return DateTime(e.date.year, e.date.month, e.date.day);
    });
    final sortedDates = grouped.keys.toList()..sort((a, b) => b.compareTo(a));

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) => [
          pw.Header(
            level: 0,
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('Expense Logs', style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold)),
                pw.Text('${DateFormat('dd/MM/yyyy').format(start)} - ${DateFormat('dd/MM/yyyy').format(end)}'),
              ],
            ),
          ),
          pw.Text(settings.organizationName, style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 20),
          ...sortedDates.map((date) {
            final dailyExpenses = grouped[date]!;
            final dailyTotal = dailyExpenses.fold(0.0, (sum, e) => sum + e.amount);
            return pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Container(
                  padding: const pw.EdgeInsets.all(5),
                  color: PdfColors.grey300,
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text(DateFormat('dd/MM/yyyy').format(date), style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                      pw.Text('Total: ${CurrencyFormatter.formatWithSymbol(dailyTotal, symbol: currencySymbol)}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                    ],
                  ),
                ),
                pw.Table.fromTextArray(
                  headers: ['Category', 'Description', 'Amount'],
                  data: dailyExpenses.map((e) => [
                    e.category ?? 'Other',
                    e.description,
                    CurrencyFormatter.formatWithSymbol(e.amount, symbol: currencySymbol),
                  ]).toList(),
                  headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                  cellAlignments: {
                    2: pw.Alignment.centerRight,
                  },
                ),
                pw.SizedBox(height: 15),
              ],
            );
          }),
        ],
      ),
    );

    return pdf;
  }

  static List<PrintCommand> buildExpenseLogsThermalCommands({
    required List<Expense> expenses,
    required AppSettings settings,
    required DateTime start,
    required DateTime end,
  }) {
    final commands = <PrintCommand>[];
    final currencySymbol = settings.currency;

    commands.add(TextCommand('EXPENSE LOGS', isBold: true, align: 'center'));
    commands.add(TextCommand('${DateFormat('dd/MM').format(start)} - ${DateFormat('dd/MM').format(end)}', align: 'center'));
    commands.add(DividerCommand());
    commands.add(TextCommand(settings.organizationName.toUpperCase(), align: 'center'));
    commands.add(SizedBoxCommand(height: 1));

    for (final e in expenses) {
      commands.add(TextCommand('${DateFormat('dd/MM').format(e.date)} - ${e.category ?? 'Other'}'));
      commands.add(TextCommand(e.description));
      commands.add(TextCommand(CurrencyFormatter.formatWithSymbol(e.amount, symbol: currencySymbol), align: 'right'));
      commands.add(SizedBoxCommand(height: 1));
    }

    commands.add(DividerCommand());
    commands.add(TextCommand('TOTAL: ${CurrencyFormatter.formatWithSymbol(expenses.fold(0.0, (sum, e) => sum + e.amount), symbol: currencySymbol)}', isBold: true, align: 'right'));
    commands.add(SizedBoxCommand(height: 1));
    commands.add(TextCommand('Generated by Sales Involve', align: 'center'));
    commands.add(SizedBoxCommand(height: 3));

    return commands;
  }
}

class _ActivityEvent {
  final DateTime date;
  final String invoiceNumber;
  final String type;
  final String details;
  final double amount;
  final String staff;

  _ActivityEvent({
    required this.date,
    required this.invoiceNumber,
    required this.type,
    required this.details,
    required this.amount,
    required this.staff,
  });
}

