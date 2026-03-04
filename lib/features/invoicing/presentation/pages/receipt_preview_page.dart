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
import '../../domain/templates/template_registry.dart';

class ReceiptPreviewPage extends StatelessWidget {
  final Invoice invoice;
  final bool? useCustomPrices;

  const ReceiptPreviewPage({super.key, required this.invoice, this.useCustomPrices});

  @override
  Widget build(BuildContext context) {
    final settings = context.read<SettingsBloc>().state.settings;
    if (settings == null) return const Scaffold(body: Center(child: Text('Settings not loaded')));

    final bool actualUseCustom = useCustomPrices ?? settings.customReceiptPricingEnabled;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Receipt Preview'),
            if (actualUseCustom && invoice.totalPrintAmount != null)
              Text(
                'Using Custom Receipt Prices', 
                style: TextStyle(fontSize: 12, color: Colors.blue[100]),
              ),
          ],
        ),
        actions: [
          // Thermal Print Action
          IconButton(
            icon: const Icon(Icons.print),
            tooltip: 'Thermal Print',
            onPressed: () => _printThermal(context, invoice, actualUseCustom),
          ),
        ],
      ),
      body: PdfPreview(
        build: (format) => ReceiptService().generateReceiptPdf(
          invoice, 
          settings,
          useCustomPricesOverride: actualUseCustom,
        ),
        pdfFileName: 'Invoice-${invoice.id}.pdf',
      ),
    );
  }

  Future<void> _onShareManual(BuildContext context, PdfPageFormat format, Uint8List bytes) async {
    await Printing.sharePdf(bytes: bytes, filename: 'Invoice-${invoice.id}.pdf');
  }

  Future<void> _printThermal(BuildContext context, Invoice invoice, bool useCustomPrices) async {
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
      
      // Use Registry to get the correct template instance
      TemplateType type;
      switch (templateName) {
        case 'detailed': type = TemplateType.detailed; break;
        case 'professional': type = TemplateType.professional; break;
        case 'modern': type = TemplateType.modern; break;
        case 'classic': type = TemplateType.classic; break;
        case 'minimalist': type = TemplateType.minimalist; break;
        case 'school_teal': type = TemplateType.schoolTeal; break;
        case 'school_purple': type = TemplateType.schoolPurple; break;
        case 'school_academic': type = TemplateType.schoolAcademic; break;
        case 'school_traditional': type = TemplateType.schoolTraditional; break;
        default: type = TemplateType.compact;
      }
      
      final template = TemplateRegistry.getTemplate(type);
      
      // We pass a modified settings object if we want to force a specific price mode
      final printSettings = settings!.copyWith(
        customReceiptPricingEnabled: useCustomPrices,
      );
      
      final commands = template.generateCommands(invoice, printSettings);
      
      printerBloc.add(PrintCommandsEvent(commands, settings.paperWidth)); 
      
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
