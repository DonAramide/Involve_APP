import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import '../../../domain/entities/invoice.dart';
import '../../../domain/services/report_generator.dart' hide DateTimeRange;
import '../../../../settings/domain/entities/settings.dart';

class ReportPreviewPage extends StatelessWidget {
  final List<Invoice> invoices;
  final AppSettings settings;
  final ReportDateRange? dateRange;

  const ReportPreviewPage({
    super.key,
    required this.invoices,
    required this.settings,
    this.dateRange,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sales Report Preview'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
      ),
      body: PdfPreview(
        build: (format) async {
          final doc = await ReportGenerator.buildReport(
            invoices: invoices,
            settings: settings,
            dateRange: dateRange,
          );
          return doc.save();
        },
        pdfFileName: 'Sales_Report.pdf',
        canChangePageFormat: false,
        canChangeOrientation: false,
        allowPrinting: true,
        allowSharing: true,
      ),
    );
  }
}
