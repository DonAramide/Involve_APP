import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/invoicing/domain/services/report_generator.dart' hide DateTimeRange;
import 'package:involve_app/features/invoicing/domain/entities/report_date_range.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';

import 'package:involve_app/features/invoicing/domain/entities/stock_return.dart';
import 'package:involve_app/features/settings/domain/entities/staff.dart';

class ReportPreviewPage extends StatelessWidget {
  final List<Invoice> invoices;
  final AppSettings settings;
  final InvReportDateRange? dateRange;
  final List<StockReturn>? stockReturns;
  final List<Staff>? staffList;
  final ReportType reportType;

  const ReportPreviewPage({
    super.key,
    required this.invoices,
    required this.settings,
    this.dateRange,
    this.stockReturns,
    this.staffList,
    this.reportType = ReportType.standard,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(reportType == ReportType.activity ? 'Activity Report Preview' : 'Sales Report Preview'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
      ),
      body: PdfPreview(
        build: (format) async {
          if (reportType == ReportType.activity) {
            return (await ReportGenerator.buildActivityReport(
              invoices: invoices,
              stockReturns: stockReturns ?? [],
              settings: settings,
              staffList: staffList ?? [],
              dateRange: dateRange,
            )).save();
          }
          
          final doc = await ReportGenerator.buildReport(
            invoices: invoices,
            settings: settings,
            dateRange: dateRange,
            stockReturns: stockReturns,
          );
          return doc.save();
        },
        pdfFileName: reportType == ReportType.activity ? 'Activity_Report.pdf' : 'Sales_Report.pdf',
        canChangePageFormat: false,
        canChangeOrientation: false,
        allowPrinting: true,
        allowSharing: true,
      ),
    );
  }
}
