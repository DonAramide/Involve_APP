import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:printing/printing.dart';
import 'package:pdf/pdf.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import '../../domain/entities/invoice.dart';
import '../../../printer/domain/services/receipt_service.dart';
import '../../../printer/data/repositories/cross_platform_printer_service.dart';
import '../../domain/templates/invoice_template.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';

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
        canChangeOrientation: false,
        canChangePageFormat: false,
        initialPageFormat: PdfPageFormat.roll80,
        pdfFileName: 'Invoice-${invoice.id}.pdf',
        // Enabling default actions
        canDebug: false,
        canPrint: true,
        canShare: true,
      ),
    );
  }

  Future<void> _onShareManual(BuildContext context, PdfPageFormat format, Uint8List bytes) async {
    await Printing.sharePdf(bytes: bytes, filename: 'Invoice-${invoice.id}.pdf');
  }

  Future<void> _printThermal(BuildContext context, Invoice invoice) async {
    // Reuse existing thermal print logic
    try {
      final printerService = CrossPlatformPrinterService();
      if (!await printerService.isConnected()) {
        final devices = await printerService.scanDevices();
        if (devices.isNotEmpty) {
          await printerService.connect(devices.first); // Auto connect to first for now
        } else {
           if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No thermal printer found')));
           }
           return;
        }
      }

      final profile = await CapabilityProfile.load();
      final generator = Generator(PaperSize.mm58, profile);
      List<PrintCommand> commands = [];
      
      // LOGO
      final settings = context.read<SettingsBloc>().state.settings;
      if (settings?.logo != null) {
        commands.add(ImageCommand(bytes: settings!.logo!, align: 'center'));
      }

      // TEXT (Simulate basic text for now, or move logic to a shared generator)
      commands.add(TextCommand(settings?.organizationName ?? 'Store', isBold: true, align: 'center'));
      commands.add(TextCommand('Recipe/Invoice #${invoice.id}', align: 'center'));
      commands.add(DividerCommand());
      
      for (final item in invoice.items) {
        commands.add(TextCommand('${item.item.name} x${item.quantity}'));
        commands.add(TextCommand('${settings?.currency ?? '₦'} ${(item.unitPrice * item.quantity).toStringAsFixed(2)}', align: 'right'));
      }
      
      commands.add(DividerCommand());
      commands.add(TextCommand('Total: ${settings?.currency ?? '₦'} ${invoice.totalAmount.toStringAsFixed(2)}', isBold: true, align: 'right'));
      commands.add(TextCommand('Thank you!', align: 'center'));

      await printerService.printCommands(commands);
      
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sent to Thermal Printer')));
      }

    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Print Error: $e')));
      }
    }
  }
}
