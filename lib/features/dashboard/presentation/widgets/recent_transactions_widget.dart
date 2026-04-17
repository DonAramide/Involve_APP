import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/features/invoicing/presentation/history/bloc/history_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/history/bloc/history_state.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/pages/receipt_preview_page.dart';
import 'package:involve_app/features/services/presentation/bloc/services_bloc.dart';
import 'package:involve_app/features/services/presentation/bloc/services_state.dart';
import 'package:involve_app/features/services/domain/entities/service_job.dart';
import 'package:involve_app/features/services/presentation/pages/job_details_page.dart';

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
              builder: (context, historyState) {
                return BlocBuilder<ServicesBloc, ServicesState>(
                  builder: (context, servicesState) {
                    final List<dynamic> combinedList = [];
                    
                    if (historyState is HistoryLoaded) {
                      combinedList.addAll(historyState.invoices);
                    }
                    
                    if (servicesState.status == ServicesStatus.success) {
                      combinedList.addAll(servicesState.jobs);
                    }

                    // Sort by date (descending)
                    combinedList.sort((a, b) {
                      final dateA = a is Invoice ? a.dateCreated : (a as ServiceJob).createdAt;
                      final dateB = b is Invoice ? b.dateCreated : (b as ServiceJob).createdAt;
                      return dateB.compareTo(dateA);
                    });

                    final recentItems = combinedList.take(15).toList();

                    if (recentItems.isEmpty) {
                      if (historyState is HistoryLoading || (servicesState.status == ServicesStatus.loading && servicesState.jobs.isEmpty)) {
                        return const Center(child: CircularProgressIndicator());
                      }
                      return const Center(
                        child: Text('No recent transactions', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      );
                    }

                    return ListView.separated(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      itemCount: recentItems.length,
                      separatorBuilder: (context, index) => const Divider(height: 1, indent: 16, endIndent: 16),
                      itemBuilder: (context, index) {
                        final item = recentItems[index];
                        
                        if (item is Invoice) {
                          return _buildInvoiceItem(context, item, settings, theme);
                        } else {
                          return _buildJobItem(context, item as ServiceJob, settings, theme);
                        }
                      },
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInvoiceItem(BuildContext context, Invoice invoice, dynamic settings, ThemeData theme) {
    return ListTile(
      dense: true,
      visualDensity: VisualDensity.compact,
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: Colors.blue.withOpacity(0.1), shape: BoxShape.circle),
        child: const Icon(Icons.shopping_bag_outlined, size: 16, color: Colors.blue),
      ),
      title: Text(
        invoice.customerName ?? 'Walk-in Customer',
        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        '${DateFormat('HH:mm').format(invoice.dateCreated)} • Retail',
        style: const TextStyle(fontSize: 11),
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            CurrencyFormatter.formatWithSymbol(invoice.totalAmount, symbol: settings?.currency ?? '₦'),
            style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.primary, fontSize: 13),
          ),
          Text(
            invoice.paymentStatus.toUpperCase(),
            style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: _getStatusColor(invoice.paymentStatus)),
          ),
        ],
      ),
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ReceiptPreviewPage(invoice: invoice))),
    );
  }

  Widget _buildJobItem(BuildContext context, ServiceJob job, dynamic settings, ThemeData theme) {
    return ListTile(
      dense: true,
      visualDensity: VisualDensity.compact,
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: Colors.orange.withOpacity(0.1), shape: BoxShape.circle),
        child: const Icon(Icons.build_circle_outlined, size: 16, color: Colors.orange),
      ),
      title: Text(
        job.title,
        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        '${DateFormat('HH:mm').format(job.createdAt)} • ${job.jobId}',
        style: const TextStyle(fontSize: 11),
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            CurrencyFormatter.formatWithSymbol(job.totalAmount, symbol: settings?.currency ?? '₦'),
            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange.shade700, fontSize: 13),
          ),
          Text(
            job.status.replaceAll('_', ' ').toUpperCase(),
            style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: _getJobStatusColor(job.status)),
          ),
        ],
      ),
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => JobDetailsPage(job: job))),
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

  Color _getJobStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending': return Colors.grey;
      case 'in_progress': return Colors.orange;
      case 'ready': return Colors.green;
      case 'delivered': return Colors.blue;
      default: return Colors.grey;
    }
  }
}
