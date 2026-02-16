import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/history_bloc.dart';
import '../bloc/history_state.dart';
import '../../../domain/entities/invoice.dart';
import '../../../../printer/presentation/bloc/printer_bloc.dart';
import '../../../../printer/domain/usecases/printer_usecases.dart';
import '../../../domain/templates/template_registry.dart';
import '../../../domain/templates/invoice_template.dart';
import '../../../../settings/presentation/bloc/settings_bloc.dart';
import '../../pages/receipt_preview_page.dart';
import 'package:invify/core/utils/currency_formatter.dart';

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
      body: Column(
        children: [
          _buildFilterHeader(context),
          Expanded(
            child: BlocBuilder<HistoryBloc, HistoryState>(
              builder: (context, state) {
                if (state is HistoryLoading) {
                  return const Center(child: CircularProgressIndicator());
                } else if (state is HistoryLoaded) {
                  if (state.invoices.isEmpty) {
                    return const Center(child: Text('No invoices found.'));
                  }
                  return Column(
                    children: [
                      _buildTotalSummary(context, state),
                      Expanded(
                        child: ListView.builder(
                          itemCount: state.invoices.length,
                          itemBuilder: (context, index) {
                            final invoice = state.invoices[index];
                            return _buildInvoiceCard(context, invoice);
                          },
                        ),
                      ),
                    ],
                  );
                } else if (state is HistoryError) {
                  return Center(child: Text(state.message));
                }
                return const Center(child: Text('Start searching!'));
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterHeader(BuildContext context) {
    final state = context.watch<HistoryBloc>().state;
    String currentQuery = '';
    double? currentAmount;
    
    if (state is HistoryLoaded) {
      currentQuery = state.query ?? '';
      currentAmount = state.amount;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.grey[100],
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Search Invoice ID',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
                filled: true,
                fillColor: Colors.white,
                contentPadding: EdgeInsets.symmetric(horizontal: 12),
              ),
              onChanged: (value) {
                context.read<HistoryBloc>().add(LoadHistory(
                  start: _selectedRange?.start,
                  end: _selectedRange?.end,
                  query: value,
                  amount: currentAmount,
                ));
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 1,
            child: TextField(
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                hintText: 'Amount',
                prefixIcon: Icon(Icons.attach_money),
                border: OutlineInputBorder(),
                filled: true,
                fillColor: Colors.white,
                contentPadding: EdgeInsets.symmetric(horizontal: 12),
              ),
              onChanged: (value) {
                final amount = double.tryParse(value);
                context.read<HistoryBloc>().add(LoadHistory(
                  start: _selectedRange?.start,
                  end: _selectedRange?.end,
                  query: currentQuery,
                  amount: amount,
                ));
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInvoiceCard(BuildContext context, Invoice invoice) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ExpansionTile(
        title: Text('${invoice.invoiceNumber}'),
        subtitle: Text('Date: ${invoice.dateCreated.toString().split('.')[0]} • Total: ${CurrencyFormatter.formatWithSymbol(invoice.totalAmount, symbol: context.read<SettingsBloc>().state.settings?.currency ?? '₦')}'),
        children: [
          ...invoice.items.map((item) => ListTile(
                dense: true,
                title: Text(item.item.name),
                trailing: Text('${item.quantity} x ${CurrencyFormatter.formatWithSymbol(item.unitPrice, symbol: context.read<SettingsBloc>().state.settings?.currency ?? '₦')}'),
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
      lastDate: DateTime.now().add(const Duration(days: 1)),
      initialDateRange: _selectedRange,
    );
    
    if (range != null && context.mounted) {
      // Pick start time
      final startTime = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(range.start),
        helpText: 'SELECT START TIME',
      );
      
      if (startTime == null || !context.mounted) return;
      
      // Pick end time
      final endTime = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(range.end.add(const Duration(hours: 23, minutes: 59))),
        helpText: 'SELECT END TIME',
      );
      
      if (endTime == null || !context.mounted) return;
      
      final startDateTime = DateTime(
        range.start.year,
        range.start.month,
        range.start.day,
        startTime.hour,
        startTime.minute,
      );
      
      final endDateTime = DateTime(
        range.end.year,
        range.end.month,
        range.end.day,
        endTime.hour,
        endTime.minute,
      );

      setState(() => _selectedRange = DateTimeRange(start: startDateTime, end: endDateTime));
      context.read<HistoryBloc>().add(LoadHistory(start: startDateTime, end: endDateTime));
    }
  }

  void _reprint(BuildContext context, Invoice invoice) {
    // Get settings from SettingsBloc
    final settingsState = context.read<SettingsBloc>().state;
    final settings = settingsState.settings;
    
    if (settings != null) {
      // Logic to reprint using existing printer bloc and template engine
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ReceiptPreviewPage(invoice: invoice),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Settings not loaded. Cannot print.')),
      );
    }
  }

  Widget _buildTotalSummary(BuildContext context, HistoryLoaded state) {
    final currency = context.read<SettingsBloc>().state.settings?.currency ?? '₦';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          const Text(
            'TOTAL SALES FOR PERIOD',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.blueGrey,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            CurrencyFormatter.formatWithSymbol(
              state.totalSales,
              symbol: currency,
            ),
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.blue,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${state.invoices.length} Invoices',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }
}
