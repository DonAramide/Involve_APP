import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/history_bloc.dart';
import '../bloc/history_state.dart';
import '../../../domain/entities/invoice.dart';
import '../../../../printer/presentation/bloc/printer_bloc.dart';
import '../../../../printer/domain/usecases/printer_usecases.dart';
import '../../../domain/templates/template_registry.dart';
import '../../../domain/templates/invoice_template.dart';

class InvoiceHistoryPage extends StatefulWidget {
  const InvoiceHistoryPage({super.key});

  @override
  State<InvoiceHistoryPage> createState() => _InvoiceHistoryPageState();
}

class _InvoiceHistoryPageState extends State<InvoiceHistoryPage> {
  DateTimeRange? _selectedRange;

  @override
  void initState() {
    super.initState();
    context.read<HistoryBloc>().add(LoadHistory());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Invoice History'),
        actions: [
          IconButton(
            icon: const Icon(Icons.date_range),
            onPressed: () => _selectDateRange(context),
          ),
          if (_selectedRange != null)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                setState(() => _selectedRange = null);
                context.read<HistoryBloc>().add(LoadHistory());
              },
            ),
        ],
      ),
      body: BlocBuilder<HistoryBloc, HistoryState>(
        builder: (context, state) {
          if (state is HistoryLoading) {
            return const Center(child: CircularProgressIndicator());
          } else if (state is HistoryLoaded) {
            if (state.invoices.isEmpty) {
              return const Center(child: Text('No invoices found.'));
            }
            return ListView.builder(
              itemCount: state.invoices.length,
              itemBuilder: (context, index) {
                final invoice = state.invoices[index];
                return _buildInvoiceCard(context, invoice);
              },
            );
          } else if (state is HistoryError) {
            return Center(child: Text(state.message));
          }
          return const Center(child: Text('Start searching!'));
        },
      ),
    );
  }

  Widget _buildInvoiceCard(BuildContext context, Invoice invoice) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ExpansionTile(
        title: Text('${invoice.invoiceNumber}'),
        subtitle: Text('Date: ${invoice.dateCreated.toString().split('.')[0]} • Total: \$${invoice.totalAmount.toStringAsFixed(2)}'),
        children: [
          ...invoice.items.map((item) => ListTile(
                dense: true,
                title: Text(item.item.name),
                trailing: Text('${item.quantity} x \$${item.unitPrice}'),
              )),
          const Divider(),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                ElevatedButton.icon(
                  onPressed: () => _reprint(context, invoice),
                  icon: const Icon(Icons.print),
                  label: const Text('REPRINT'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _selectDateRange(BuildContext context) async {
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (range != null) {
      setState(() => _selectedRange = range);
      context.read<HistoryBloc>().add(LoadHistory(start: range.start, end: range.end));
    }
  }

  void _reprint(BuildContext context, Invoice invoice) {
    // Logic to reprint using existing printer bloc and template engine
    final template = TemplateRegistry.getTemplate(TemplateType.compact);
    final commands = template.generateCommands(invoice, {}); // Dummy settings for now
    context.read<PrinterBloc>().printInvoice(commands, 58);
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Reprinting invoice...')),
    );
  }
}
