import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/features/invoicing/presentation/history/bloc/history_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/history/bloc/history_state.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:collection/collection.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

import 'package:involve_app/features/services/domain/entities/service_customer.dart';
import 'package:involve_app/features/school_finance/domain/repositories/finance_repository_new.dart';
import 'package:involve_app/features/services/domain/repositories/services_repository.dart';

class CustomerHistoryPage extends StatefulWidget {
  final ServiceCustomer customer;
  final DateTimeRange? initialDateRange;

  const CustomerHistoryPage({
    super.key,
    required this.customer,
    this.initialDateRange,
  });

  @override
  State<CustomerHistoryPage> createState() => _CustomerHistoryPageState();
}

class _CustomerHistoryPageState extends State<CustomerHistoryPage> {
  DateTimeRange? _selectedRange;
  late ServiceCustomer _currentCustomer;

  @override
  void initState() {
    super.initState();
    _currentCustomer = widget.customer;
    _selectedRange = widget.initialDateRange;
    _loadHistory();
  }

  void _loadHistory() {
    context.read<HistoryBloc>().add(LoadHistory(
      customerName: _currentCustomer.name,
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
        title: Text(_currentCustomer.name),
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
            return const InvifyLoadingIndicator(message: 'RETRIEVING TRANSACTION LEDGERS...');
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
                _buildVirtualAccountCard(_currentCustomer, currency),
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

  Widget _buildVirtualAccountCard(ServiceCustomer customer, String currency) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('WALLET BALANCE', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
              Text(
                '₦${customer.balance.toStringAsFixed(2)}',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: customer.balance > 0 ? Colors.red : (customer.balance < 0 ? Colors.green : Colors.black),
                ),
              ),
            ],
          ),
          if (customer.balance > 0)
            const Padding(
              padding: EdgeInsets.only(top: 4.0),
              child: Text('Customer owes you this amount.', style: TextStyle(color: Colors.red, fontSize: 12)),
            )
          else if (customer.balance < 0)
            const Padding(
              padding: EdgeInsets.only(top: 4.0),
              child: Text('You owe the customer this amount.', style: TextStyle(color: Colors.green, fontSize: 12)),
            ),
          const Divider(height: 24),
          if (customer.virtualAccountNumber != null) ...[
            const Text('VIRTUAL ACCOUNT DETAILS', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade300),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: Colors.deepPurple.shade500,
                        radius: 24,
                        child: Text(
                          customer.virtualAccountName?.isNotEmpty == true ? customer.virtualAccountName![0].toUpperCase() : 'C',
                          style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              (customer.virtualAccountName ?? 'CUSTOMER ACCOUNT').toUpperCase(),
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, letterSpacing: 1.1, color: Colors.black),
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              customer.virtualAccountBank ?? '',
                              style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.deepPurple.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      customer.virtualAccountNumber!,
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 2.0, color: Colors.deepPurple.shade900),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.blue.shade50,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.account_balance, size: 14, color: Colors.blue.shade700),
                                  const SizedBox(width: 4),
                                  Text('Bank Info', style: TextStyle(color: Colors.blue.shade900, fontWeight: FontWeight.bold, fontSize: 12)),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Text('Bank Name', style: TextStyle(color: Colors.blue.shade700, fontSize: 10)),
                              Text(customer.virtualAccountBank ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.black)),
                              const SizedBox(height: 8),
                              Text('Type', style: TextStyle(color: Colors.blue.shade700, fontSize: 10)),
                              const Text('Virtual Account', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.black)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.purple.shade50,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.payments, size: 14, color: Colors.purple.shade700),
                                  const SizedBox(width: 4),
                                  Text('Status', style: TextStyle(color: Colors.purple.shade900, fontWeight: FontWeight.bold, fontSize: 12)),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Text('Account', style: TextStyle(color: Colors.purple.shade700, fontSize: 10)),
                              Text(customer.virtualAccountNumber!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.black)),
                              const SizedBox(height: 8),
                              Text('State', style: TextStyle(color: Colors.purple.shade700, fontSize: 10)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.green.shade100,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text('ACTIVE', style: TextStyle(color: Colors.green.shade900, fontWeight: FontWeight.bold, fontSize: 10)),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ] else ...[
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _generateVirtualAccount(customer),
                icon: const Icon(Icons.add_card),
                label: const Text('Generate Static Virtual Account'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _generateVirtualAccount(ServiceCustomer customer) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: InvifyLoadingIndicator(message: 'Provisioning Virtual Account...')),
    );

    try {
      final financeRepo = context.read<FinanceRepository>();
      final result = await financeRepo.initiateCustomerVirtualAccount(
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        email: customer.email,
      );

      if (mounted) {
        Navigator.pop(context); // Close loading dialog
        
        if (result['accountNumber'] != null) {
          final acctNum = result['accountNumber'];
          final bankName = result['bankName'];
          
          try {
            final svcRepo = context.read<IServicesRepository>();
            await svcRepo.updateCustomerVirtualAccount(customer.id, acctNum, bankName);
          } catch (e) {
            // Ignore if repository is not injected or fails
          }
          
          setState(() {
            _currentCustomer = _currentCustomer.copyWith(
              virtualAccountNumber: acctNum,
              virtualAccountBank: bankName,
            );
          });
          
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Virtual account generated successfully!')),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Virtual account generation failed or returned empty.')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // Close loading dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to generate virtual account: $e')),
        );
      }
    }
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
