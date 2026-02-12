import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:printing/printing.dart';
import 'package:pdf/pdf.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import '../../domain/entities/invoice.dart';
import '../../../printer/domain/services/receipt_service.dart';
import '../../../printer/data/repositories/cross_platform_printer_service.dart';
import '../../domain/templates/invoice_template.dart';
import '../../domain/templates/concrete_templates.dart';
import '../../../printer/presentation/bloc/printer_state.dart';
import '../../../printer/presentation/bloc/printer_bloc.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import '../../../settings/domain/entities/settings.dart';

class ReceiptPreviewPage extends StatelessWidget {
  final Invoice invoice;

  const ReceiptPreviewPage({super.key, required this.invoice});

  @override
  Widget build(BuildContext context) {
    final settings = context.read<SettingsBloc>().state.settings;
    if (settings == null) return const Scaffold(body: Center(child: Text('Settings not loaded')));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Receipt Preview'),
        actions: [
          // Thermal Print Action
          IconButton(
            icon: const Icon(Icons.print),
            tooltip: 'Thermal Print',
            onPressed: () => _printThermal(context, invoice),
          ),
        ],
      ),
      body: PdfPreview(
        build: (format) => ReceiptService().generateReceiptPdf(
          invoice, 
          settings,
        ),
        pdfFileName: 'Invoice-${invoice.id}.pdf',
      ),
    );
  }

  Future<void> _onShareManual(BuildContext context, PdfPageFormat format, Uint8List bytes) async {
    await Printing.sharePdf(bytes: bytes, filename: 'Invoice-${invoice.id}.pdf');
  }

  Future<void> _printThermal(BuildContext context, Invoice invoice) async {
    final printerBloc = context.read<PrinterBloc>();
    final settings = context.read<SettingsBloc>().state.settings;

    if (printerBloc.state.connectedDevice == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No printer connected. Please connect in Settings.')),
      );
      return;
    }

    try {
      // Use preferred template
      final templateName = settings?.defaultInvoiceTemplate ?? 'compact';
      final template = templateName == 'detailed' ? DetailedInvoiceTemplate() : CompactInvoiceTemplate();
      
      final commands = template.generateCommands(invoice, settings!);
      
      printerBloc.add(PrintCommandsEvent(commands, 58)); 
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sending to printer...')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Print Error: $e')),
      );
    }
  }
}
