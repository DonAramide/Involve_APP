import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/invoice_bloc.dart';
import '../bloc/invoice_state.dart';
import '../../../printer/presentation/bloc/printer_bloc.dart';
import '../../../printer/presentation/bloc/printer_state.dart';
import '../../../printer/domain/usecases/printer_usecases.dart';
import '../../domain/templates/template_registry.dart';
import '../../domain/templates/invoice_template.dart';
import '../../domain/entities/invoice.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import '../../../settings/presentation/bloc/settings_state.dart';
import '../pages/receipt_preview_page.dart';
import '../../domain/templates/concrete_templates.dart';
import '../../domain/usecases/history_usecases.dart';
import 'package:invify/core/utils/currency_formatter.dart';

class InvoicePreviewDialog extends StatelessWidget {
  final InvoiceBloc invoiceBloc;

  const InvoicePreviewDialog({super.key, required this.invoiceBloc});

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: invoiceBloc,
      child: BlocListener<InvoiceBloc, InvoiceState>(
        listener: (context, state) {
          if (state.isSaved) {
            Navigator.pop(context); // Close preview
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Invoice saved successfully!')),
            );
            invoiceBloc.add(ResetInvoice());
          }
        },
        child: BlocBuilder<InvoiceBloc, InvoiceState>(
          builder: (context, invoiceState) {
            return BlocBuilder<SettingsBloc, SettingsState>(
              builder: (context, settingsState) {
                final settings = settingsState.settings;
                
                return AlertDialog(
                  title: const Text('Invoice Preview'),
                  content: SizedBox(
                    width: 400,
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Center(
                            child: Text(
                              settings?.organizationName ?? 'BAR & HOTEL NAME',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                            ),
                          ),
                          if (settings?.businessDescription != null && settings!.businessDescription!.isNotEmpty)
                            Center(
                              child: Text(
                                settings.businessDescription!,
                                style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          Center(child: Text(settings?.address ?? 'Address Line 1, City')),
                          Center(child: Text('Phone: ${settings?.phone ?? 'N/A'}')),
                          const Divider(),
                          Center(
                            child: Text(
                              'Invoice #INV-${DateTime.now().millisecondsSinceEpoch}',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ),
                          Center(
                            child: Text(
                              'Date: ${DateTime.now().toIso8601String().split('T')[0]}',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                          const Divider(),
                          ...invoiceState.items.map((item) => Padding(
                                padding: const EdgeInsets.symmetric(vertical: 4),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('${item.quantity}x ${item.item.name}'),
                                    Text(
                                      CurrencyFormatter.formatWithSymbol(
                                        item.total,
                                        symbol: settings?.currency ?? '₦',
                                      ),
                                    ),
                                  ],
                                ),
                              )),
                          const Divider(),
                          _row('Subtotal', invoiceState.subtotal, settings?.currency ?? '₦'),
                          _row('Tax (${(invoiceState.taxRate * 100).toStringAsFixed(0)}%)', invoiceState.tax, settings?.currency ?? '₦'),
                          if (invoiceState.discount > 0)
                            _row('Discount', -invoiceState.discount, settings?.currency ?? '₦'),
                          const Divider(),
                          _row('Total', invoiceState.total, settings?.currency ?? '₦', isTotal: true),
                          if (settings?.showAccountDetails == true && settings?.bankName != null) ...[
                            const SizedBox(height: 12),
                            const Divider(thickness: 1),
                            const Center(
                              child: Text(
                                'PAYMENT DETAILS',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Center(
                              child: Text(
                                'Bank: ${settings!.bankName}',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                            Center(
                              child: Text(
                                'Account: ${settings.accountNumber ?? ""}',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                            Center(
                              child: Text(
                                'Name: ${settings.accountName ?? ""}',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          ],
                          if (settings?.showSignatureSpace == true) ...[
                            const SizedBox(height: 8),
                            const Center(
                              child: Text(
                                'Signature: ____________________',
                                style: TextStyle(fontSize: 12),
                              ),
                            ),
                          ],
                          const SizedBox(height: 12),
                          Center(
                            child: Text(
                              settings?.receiptFooter ?? 'Thank you!',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ),
                          const Center(
                            child: Text(
                              'Powered by IIPS',
                              style: TextStyle(fontSize: 10, color: Colors.grey),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context), child: const Text('EDIT')),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                      ),
                      onPressed: invoiceState.isSaving ? null : () async {
                        // Capture data for printing
                        final items = List<InvoiceItem>.from(invoiceState.items);
                        final subtotal = invoiceState.subtotal;
                        final tax = invoiceState.tax;
                        final total = invoiceState.total;
                        
                        // Save invoice
                        context.read<InvoiceBloc>().add(SaveInvoice());
                        
                        // Create temporary invoice object for printing
                        final invoice = Invoice(
                          id: 0, 
                          invoiceNumber: 'TEMP',
                          dateCreated: DateTime.now(),
                          items: items,
                          subtotal: subtotal,
                          taxAmount: tax,
                          discountAmount: 0,
                          totalAmount: total,
                          paymentStatus: 'Paid',
                        );

                        // Trigger Print using preferred template
                        final templateName = settings?.defaultInvoiceTemplate ?? 'compact';
                        final InvoiceTemplate template;
                        if (templateName == 'detailed') {
                          template = DetailedInvoiceTemplate();
                        } else if (templateName == 'minimalist') {
                          template = MinimalistInvoiceTemplate();
                        } else {
                          template = CompactInvoiceTemplate();
                        }
                        final commands = template.generateCommands(invoice, settings!);
                        
                        context.read<PrinterBloc>().add(PrintCommandsEvent(commands, 58));
                        
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Saving and sending to printer...')),
                        );
                      },
                      child: invoiceState.isSaving 
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('SAVE & PRINT'),
                    ),
                    ElevatedButton(
                      onPressed: invoiceState.isSaving ? null : () async {
                        context.read<InvoiceBloc>().add(SaveInvoice());
                        
                        // Wait for invoice to be saved and get the saved invoice
                        await Future.delayed(const Duration(milliseconds: 500));
                        
                        final savedInvoice = Invoice(
                          id: 0, 
                          invoiceNumber: 'INV-${DateTime.now().millisecondsSinceEpoch}',
                          dateCreated: DateTime.now(),
                          items: List.from(invoiceState.items),
                          subtotal: invoiceState.subtotal,
                          taxAmount: invoiceState.tax,
                          discountAmount: 0,
                          totalAmount: invoiceState.total,
                          paymentStatus: 'Paid',
                        );

                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => ReceiptPreviewPage(invoice: savedInvoice),
                          ),
                        );
                      },
                      child: invoiceState.isSaving ? const CircularProgressIndicator() : const Text('SAVE & PREVIEW'),
                    ),
                  ],
                );
              },
            );
          },
        ),
      ),
    );
  }

  Widget _row(String label, double value, String currency, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
          Text(
            CurrencyFormatter.formatWithSymbol(
              value,
              symbol: currency,
            ),
            style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal),
          ),
        ],
      ),
    );
  }
}
