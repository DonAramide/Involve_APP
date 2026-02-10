import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/invoice_bloc.dart';
import '../bloc/invoice_state.dart';
import '../../../printer/presentation/bloc/printer_bloc.dart';
import '../../../printer/domain/usecases/printer_usecases.dart';
import '../../domain/templates/template_registry.dart';
import '../../domain/templates/invoice_template.dart';
import '../../domain/entities/invoice.dart';

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
          builder: (context, state) {
            return AlertDialog(
              title: const Text('Invoice Preview'),
              content: SizedBox(
                width: 400,
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Center(
                        child: Text('BAR & HOTEL NAME', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                      ),
                      const Center(child: Text('Address Line 1, City')),
                      const Divider(),
                      ...state.items.map((item) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('${item.quantity}x ${item.item.name}'),
                                Text('\$${item.total.toStringAsFixed(2)}'),
                              ],
                            ),
                          )),
                      const Divider(),
                      _row('Subtotal', state.subtotal),
                      _row('Tax', state.tax),
                      const Divider(),
                      _row('Total', state.total, isBold: true),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context), child: const Text('EDIT')),
                ElevatedButton(
                  onPressed: state.isSaving ? null : () async {
                    context.read<InvoiceBloc>().add(SaveInvoice());
                    
                    // Trigger Printing
                    final template = TemplateRegistry.getTemplate(TemplateType.compact);
                    final commands = template.generateCommands(
                      // This would normally be the saved invoice from state
                      // Simplified for demonstration
                      Invoice(invoiceNumber: '...', dateCreated: DateTime.now(), items: [], subtotal: 0, taxAmount: 0, discountAmount: 0, totalAmount: 0, paymentStatus: ''), 
                      {} 
                    );
                    context.read<PrinterBloc>().printInvoiceCmd(commands, 58);
                  },
                  child: state.isSaving ? const CircularProgressIndicator() : const Text('SAVE & PRINT'),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _row(String label, double value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
          Text('\$${value.toStringAsFixed(2)}', style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
        ],
      ),
    );
  }
}
