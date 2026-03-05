import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/features/invoicing/presentation/history/bloc/history_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/history/bloc/history_state.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/pages/receipt_preview_page.dart';

class RecentTransactionsWidget extends StatelessWidget {
  const RecentTransactionsWidget({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final settings = context.watch<SettingsBloc>().state.settings;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0).copyWith(bottom: 8),
            child: Row(
              children: [
                Icon(Icons.history, color: theme.colorScheme.primary, size: 20),
                const SizedBox(width: 8),
                Text(
                  'RECENT TRANSACTIONS',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.1,
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: BlocBuilder<HistoryBloc, HistoryState>(
              builder: (context, state) {
                if (state is HistoryLoading) {
                  return const Center(child: CircularProgressIndicator());
                } else if (state is HistoryError) {
                  return Center(child: Text(state.message, style: const TextStyle(fontSize: 12)));
                } else if (state is HistoryLoaded) {
                  final invoices = state.invoices.take(10).toList();
                  
                  if (invoices.isEmpty) {
                    return const Center(
                      child: Text('No recent transactions', style: TextStyle(fontSize: 12, color: Colors.grey)),
                    );
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: invoices.length,
                    separatorBuilder: (context, index) => const Divider(height: 1, indent: 16, endIndent: 16),
                    itemBuilder: (context, index) {
                      final invoice = invoices[index];
                      return ListTile(
                        dense: true,
                        visualDensity: VisualDensity.compact,
                        title: Text(
                          invoice.customerName ?? 'Walk-in Customer',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          DateFormat('HH:mm').format(invoice.dateCreated),
                          style: const TextStyle(fontSize: 11),
                        ),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              CurrencyFormatter.formatWithSymbol(
                                invoice.totalAmount, 
                                symbol: settings?.currency ?? '₦'
                              ),
                              style: TextStyle(
                                fontWeight: FontWeight.bold, 
                                color: theme.colorScheme.primary,
                                fontSize: 13,
                              ),
                            ),
                            Text(
                              invoice.paymentStatus.toUpperCase(),
                              style: TextStyle(
                                fontSize: 9, 
                                fontWeight: FontWeight.bold,
                                color: _getStatusColor(invoice.paymentStatus),
                              ),
                            ),
                          ],
                        ),
                        onTap: () => _navigateToPreview(context, invoice),
                      );
                    },
                  );
                }
                return const SizedBox.shrink();
              },
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'paid': return Colors.green;
      case 'partial': return Colors.orange;
      case 'unpaid': return Colors.red;
      default: return Colors.grey;
    }
  }

  void _navigateToPreview(BuildContext context, Invoice invoice) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ReceiptPreviewPage(invoice: invoice),
      ),
    );
  }
}
