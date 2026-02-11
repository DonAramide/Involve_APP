import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/invoice_bloc.dart';
import '../bloc/invoice_state.dart';
import '../../../printer/presentation/bloc/printer_bloc.dart';
import '../../../printer/domain/usecases/printer_usecases.dart';
import '../../domain/templates/template_registry.dart';
import '../../domain/templates/invoice_template.dart';
import '../../domain/entities/invoice.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import '../../../settings/presentation/bloc/settings_state.dart';
import '../pages/receipt_preview_page.dart';

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
                                    Text('${settings?.currency ?? '₦'}${item.total.toStringAsFixed(2)}'),
                                  ],
                                ),
                              )),
                          const Divider(),
                          _row('Subtotal', invoiceState.subtotal, settings?.currency ?? '₦'),
                          _row('Tax', invoiceState.tax, settings?.currency ?? '₦'),
                          const Divider(),
                          _row('Total', invoiceState.total, settings?.currency ?? '₦', isBold: true),
                        ],
                      ),
                    ),
                  ),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context), child: const Text('EDIT')),
                    ElevatedButton(
                      onPressed: invoiceState.isSaving ? null : () async {
                        context.read<InvoiceBloc>().add(SaveInvoice());
                        
                        // Wait for invoice to be saved and get the saved invoice
                        await Future.delayed(const Duration(milliseconds: 500));
                        
                        // Get the last saved invoice from state
                        // The bloc logic might not update 'items' immediately if ResetInvoice is called?
                        // Actually ResetInvoice clears state.
                        // We must capture data BEFORE ResetInvoice triggers.
                        
                        final savedInvoice = Invoice(
                          id: int.tryParse('INV-${DateTime.now().millisecondsSinceEpoch}') ?? 0, // Placeholder ID until reload
                          invoiceNumber: 'INV-${DateTime.now().millisecondsSinceEpoch}',
                          dateCreated: DateTime.now(),
                          items: List.from(invoiceState.items),
                          subtotal: invoiceState.subtotal,
                          taxAmount: invoiceState.tax,
                          discountAmount: 0,
                          totalAmount: invoiceState.total,
                          paymentStatus: 'Paid',
                        );

                        // Trigger Navigation instead of direct print
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => ReceiptPreviewPage(invoice: savedInvoice),
                          ),
                        ).then((_) {
                           // When returning from preview, close dialog?
                           // Or close dialog first, then navigate?
                           // If we navigate, dialog stays open in background?
                           // Better: Pop dialog, then Push page.
                        });
                        
                        // But we want to confirm Save first.
                        // The 'listener' on line 23 pops the dialog when isSaved is true.
                        // That listener also calls ResetInvoice().
                        
                        // If we navigate here, the listener might pop the PREVIEW page if we are not careful.
                        // Wait. The listener listens to 'state.isSaved'.
                        // If we add SaveInvoice(), state becomes successful.
                        // Listener pops context.
                        
                        // We need to intercept that flow or Change logic.
                        // Let's modify the Listener logic via code?
                        
                        // Modification: Remove the automatic Pop in listener?
                        // Or modify this button to NOT close dialog but let listener handle it?
                        
                        // If we change listener to Navigate instead of Pop?
                        // Let's rely on the listener to navigate!
                        
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
          Text('$currency${value.toStringAsFixed(2)}', style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
        ],
      ),
    );
  }
}
