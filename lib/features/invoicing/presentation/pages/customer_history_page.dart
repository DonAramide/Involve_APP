import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/features/invoicing/presentation/history/bloc/history_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/history/bloc/history_state.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:collection/collection.dart';

class CustomerHistoryPage extends StatefulWidget {
  final String customerName;
  final DateTimeRange? initialDateRange;

  const CustomerHistoryPage({
    super.key,
    required this.customerName,
    this.initialDateRange,
  });

  @override
  State<CustomerHistoryPage> createState() => _CustomerHistoryPageState();
}

class _CustomerHistoryPageState extends State<CustomerHistoryPage> {
  DateTimeRange? _selectedRange;

  @override
  void initState() {
    super.initState();
    _selectedRange = widget.initialDateRange;
    _loadHistory();
  }

  void _loadHistory() {
    context.read<HistoryBloc>().add(LoadHistory(
      customerName: widget.customerName,
      start: _selectedRange?.start,
      end: _selectedRange?.end,
    ));
  }

  Future<void> _selectDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
      initialDateRange: _selectedRange,
    );
    if (picked != null) {
      setState(() => _selectedRange = picked);
      _loadHistory();
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.read<SettingsBloc>().state.settings;
    final currency = settings?.currency ?? '₦';

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.customerName),
        actions: [
          IconButton(
            icon: const Icon(Icons.date_range),
            onPressed: _selectDateRange,
          ),
          if (_selectedRange != null)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                setState(() => _selectedRange = null);
                _loadHistory();
              },
            ),
        ],
      ),
      body: BlocBuilder<HistoryBloc, HistoryState>(
        builder: (context, state) {
          if (state is HistoryLoading) {
            return const Center(child: CircularProgressIndicator());
          } else if (state is HistoryError) {
            return Center(child: Text(state.message));
          } else if (state is HistoryLoaded) {
            final invoices = state.invoices;
            
            // Flatten invoices into items by date
            final List<_PurchasedItem> allItems = [];
            for (final inv in invoices) {
              for (final item in inv.items) {
                allItems.add(_PurchasedItem(
                  date: inv.dateCreated,
                  name: item.item.name,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  invoiceNumber: inv.invoiceNumber,
                ));
              }
            }

            // Group by date
            final groupedItems = groupBy(allItems, (item) => DateFormat('yyyy-MM-dd').format(item.date));
            final sortedDates = groupedItems.keys.toList()..sort((a, b) => b.compareTo(a));

            return Column(
              children: [
                _buildSummaryCard(state.totalInvoiced, currency),
                Expanded(
                  child: invoices.isEmpty
                      ? const Center(child: Text('No purchases found for this period.'))
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: sortedDates.length,
                          itemBuilder: (context, index) {
                            final dateStr = sortedDates[index];
                            final items = groupedItems[dateStr]!;
                            final displayDate = DateFormat('EEEE, MMM dd, yyyy').format(items.first.date);

                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
                                  child: Text(
                                    displayDate.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: Theme.of(context).primaryColor,
                                      letterSpacing: 1.1,
                                    ),
                                  ),
                                ),
                                ...items.map((item) => _buildItemTile(item, currency)),
                                const SizedBox(height: 16),
                              ],
                            );
                          },
                        ),
                ),
              ],
            );
          }
          return const SizedBox();
        },
      ),
    );
  }

  Widget _buildSummaryCard(double totalSpent, String currency) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Theme.of(context).primaryColor, Color.lerp(Theme.of(context).primaryColor, Colors.black, 0.2)!],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).primaryColor.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'TOTAL AMOUNT SPENT',
            style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2),
          ),
          const SizedBox(height: 8),
          Text(
            CurrencyFormatter.formatWithSymbol(totalSpent, symbol: currency),
            style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
          ),
          if (_selectedRange != null)
            Padding(
              padding: const EdgeInsets.only(top: 8.0),
              child: Text(
                'For selected period',
                style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 11),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildItemTile(_PurchasedItem item, String currency) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        title: Text(item.name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('Inv: ${item.invoiceNumber} • ${DateFormat('HH:mm').format(item.date)}'),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '${item.quantity} x ${CurrencyFormatter.formatWithSymbol(item.unitPrice, symbol: currency)}',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 4),
            Text(
              CurrencyFormatter.formatWithSymbol(item.quantity * item.unitPrice, symbol: currency),
              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green),
            ),
          ],
        ),
      ),
    );
  }
}

class _PurchasedItem {
  final DateTime date;
  final String name;
  final int quantity;
  final double unitPrice;
  final String invoiceNumber;

  _PurchasedItem({
    required this.date,
    required this.name,
    required this.quantity,
    required this.unitPrice,
    required this.invoiceNumber,
  });
}
