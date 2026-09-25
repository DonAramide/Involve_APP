// lib/features/admin/presentation/pages/admin_finance_dashboard.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import '../bloc/admin_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/invoicing/presentation/history/bloc/history_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/history/bloc/history_state.dart';
import 'package:involve_app/features/invoicing/presentation/history/pages/invoice_history_page.dart';
import 'package:involve_app/core/utils/terminology.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';
import 'package:involve_app/core/utils/invoice_payment_rail.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/features/school_finance/domain/repositories/finance_repository_new.dart';

class AdminFinanceDashboardPage extends StatefulWidget {
  const AdminFinanceDashboardPage({super.key});

  @override
  State<AdminFinanceDashboardPage> createState() => _AdminFinanceDashboardPageState();
}

class _AdminFinanceDashboardPageState extends State<AdminFinanceDashboardPage> {
  Map<String, dynamic>? _exec;
  List<Map<String, dynamic>> _cloudEntries = [];
  List<double> _weekBars = const [0, 0, 0, 0, 0, 0, 0, 0];
  double _weekChangePct = 0;

  @override
  void initState() {
    super.initState();
    context.read<HistoryBloc>().add(LoadHistory());
    context.read<AdminBloc>().add(LoadAdminDashboard());
    _loadQuasarLedger();
  }

  double _n(dynamic v) {
    if (v is num) return v.toDouble();
    return double.tryParse('$v') ?? 0;
  }

  Future<void> _loadQuasarLedger() async {
    try {
      final sl = GetIt.instance;
      Map<String, dynamic> summary = {};
      List<Map<String, dynamic>> entries = [];
      List<Map<String, dynamic>> days = [];
      if (sl.isRegistered<FinanceRepository>()) {
        final repo = sl<FinanceRepository>();
        summary = await repo.getExecutiveSummary();
        try {
          days = await repo.apiClient.get('/api/finance/daily-revenue', queryParameters: {'days': 28}).then((r) {
            final raw = r.data;
            if (raw is List) {
              return raw
                  .whereType<Map>()
                  .map((e) => Map<String, dynamic>.from(e))
                  .toList();
            }
            return <Map<String, dynamic>>[];
          });
        } catch (_) {}
        try {
          final res = await repo.apiClient.get(
            '/api/finance/transactions',
            queryParameters: {'limit': 30},
          );
          if (res.data is List) {
            entries = (res.data as List)
                .whereType<Map>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList();
          }
        } catch (_) {}
      } else if (sl.isRegistered<FinanceApiClient>()) {
        final client = sl<FinanceApiClient>();
        summary = Map<String, dynamic>.from(
          (await client.get('/api/finance/executive-summary')).data as Map,
        );
        try {
          final res = await client.get('/api/finance/transactions', queryParameters: {'limit': 30});
          if (res.data is List) {
            entries = (res.data as List)
                .whereType<Map>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList();
          }
        } catch (_) {}
      }
      if (!mounted) return;
      setState(() {
        _exec = summary;
        _cloudEntries = entries;
        if (days.isNotEmpty) {
          _weekBars = _barsFromDaily(days);
          _weekChangePct = _changeFromDaily(days);
        }
      });
    } catch (e) {
      debugPrint('[InternalLedger] executive summary unavailable: $e');
    }
  }

  List<double> _barsFromDaily(List<Map<String, dynamic>> days) {
    final values = days.map((d) => _n(d['revenue'])).toList();
    if (values.length < 8) {
      while (values.length < 8) {
        values.insert(0, 0);
      }
      return values;
    }
    final chunk = (values.length / 8).ceil();
    final bars = <double>[];
    for (var i = 0; i < 8; i++) {
      final start = i * chunk;
      final end = (start + chunk).clamp(0, values.length);
      var sum = 0.0;
      for (var j = start; j < end; j++) {
        sum += values[j];
      }
      bars.add(sum);
    }
    return bars;
  }

  double _changeFromDaily(List<Map<String, dynamic>> days) {
    if (days.length < 14) return 0;
    final half = days.length ~/ 2;
    var prev = 0.0;
    var next = 0.0;
    for (var i = 0; i < days.length; i++) {
      final v = _n(days[i]['revenue']);
      if (i < half) {
        prev += v;
      } else {
        next += v;
      }
    }
    if (prev <= 0.001) return next > 0 ? 100 : 0;
    return ((next - prev) / prev) * 100;
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AdminBloc, AdminState>(
      builder: (context, adminState) {
        return BlocBuilder<HistoryBloc, HistoryState>(
          builder: (context, historyState) {
            final invoices = historyState is HistoryLoaded ? historyState.invoices : <Invoice>[];

            double totalWallet = 0.0;
            double cashOnHand = 0.0;
            double pendingQuasarLocal = 0.0;

            for (final inv in invoices) {
              final rail = classifyInvoicePaymentRail(inv.paymentMethod);
              final amount = inv.amountPaid;
              switch (rail) {
                case InvoicePaymentRail.cash:
                  cashOnHand += amount;
                  break;
                case InvoicePaymentRail.wallet:
                  totalWallet += amount;
                  break;
                case InvoicePaymentRail.card:
                case InvoicePaymentRail.vaTransfer:
                  pendingQuasarLocal += amount;
                  break;
                case InvoicePaymentRail.bankTransfer:
                case InvoicePaymentRail.other:
                  break;
              }
            }

            final sales = _exec?['salesSummary'] is Map
                ? Map<String, dynamic>.from(_exec!['salesSummary'] as Map)
                : const <String, dynamic>{};
            final apiWallet = _n(_exec?['walletBalance'] ?? adminState.metrics['internal_wallet']);
            if (apiWallet > totalWallet) totalWallet = apiWallet;
            final apiCash = _n(sales['cash']);
            if (apiCash > cashOnHand) cashOnHand = apiCash;
            final pendingQuasar = [
              _n(_exec?['pendingQuasarRemittance']),
              _n(_exec?['pendingVirtualAccountFunds']),
              _n(_exec?['unsweptVirtualAccount'] is Map
                  ? (_exec!['unsweptVirtualAccount'] as Map)['parent']
                  : 0),
              pendingQuasarLocal,
              _n(adminState.metrics['pending_quasar']),
            ].fold<double>(0, (m, v) => v > m ? v : m);

            return Scaffold(
              appBar: AppBar(title: const Text('Internal Ledger Analytics')),
              body: RefreshIndicator(
                onRefresh: () async {
                  context.read<HistoryBloc>().add(LoadHistory());
                  context.read<AdminBloc>().add(LoadAdminDashboard());
                  await _loadQuasarLedger();
                },
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildBalanceOverview(context, totalWallet, cashOnHand, pendingQuasar),
                      const SizedBox(height: 24),
                      _buildRevenueStreamChart(context),
                      const SizedBox(height: 24),
                      _buildRecentTransactions(context, invoices),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildBalanceOverview(BuildContext context, double wallet, double cash, double pending) {
    final formatter = NumberFormat.compactCurrency(symbol: '₦', decimalDigits: 1);
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Source of Truth: Internal Ledger', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.blue)),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _BalanceTile(label: 'Total Wallet', amount: formatter.format(wallet), color: Colors.blue)),
            const SizedBox(width: 12),
            Expanded(child: _BalanceTile(label: 'Cash on Hand', amount: formatter.format(cash), color: Colors.green)),
            const SizedBox(width: 12),
            Expanded(child: _BalanceTile(label: 'Pending Quasar', amount: formatter.format(pending), color: Colors.orange)),
          ],
        ),
      ],
    );
  }

  Widget _buildRevenueStreamChart(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue.shade900, Colors.indigo.shade800],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.blue.withOpacity(0.2), blurRadius: 12, offset: const Offset(0, 6)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Revenue Stream Trend', 
                style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600, fontSize: 13),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
                child: const Text('Last 30 Days', style: TextStyle(color: Colors.white, fontSize: 10)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            _weekChangePct.abs() < 0.05
                ? 'No change vs previous cycle'
                : '${_weekChangePct >= 0 ? '+' : ''}${_weekChangePct.toStringAsFixed(1)}% vs previous cycle',
            style: TextStyle(
              color: _weekChangePct >= 0 ? Colors.greenAccent : Colors.orangeAccent,
              fontWeight: FontWeight.bold,
              fontSize: 20,
            ),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: List.generate(8, (index) {
              final raw = _weekBars.length > index ? _weekBars[index] : 0.0;
              final maxBar = _weekBars.fold<double>(0, (m, v) => v > m ? v : m);
              final height = maxBar <= 0 ? 12.0 : (12 + (raw / maxBar) * 113);
              final labels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'Now'];
              final isCurrent = index == 7;
              return Column(
                children: [
                  Container(
                    width: 24,
                    height: height,
                    decoration: BoxDecoration(
                      color: isCurrent ? Colors.amberAccent : Colors.white.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(labels[index], style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 10)),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentTransactions(BuildContext context, List<Invoice> invoices) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Ledger Entries', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            TextButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const InvoiceHistoryPage()),
                );
              }, 
              child: const Text('VIEW ALL'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        BlocBuilder<SettingsBloc, SettingsState>(
          builder: (context, settingsState) {
            final settings = settingsState.settings;
            final label = settings?.saleLabel ?? 'Sale';
            final currency = settings?.currency ?? '₦';
            final formatter = NumberFormat.currency(symbol: currency, decimalDigits: 2);
            
            return BlocBuilder<HistoryBloc, HistoryState>(
              builder: (context, historyState) {
                if (historyState is HistoryLoading) {
                  return const InvifyLoadingIndicator(message: 'FETCHING LEDGER ENTRIES...');
                }
                
                final invoices = historyState is HistoryLoaded ? historyState.invoices : <Invoice>[];
                if (invoices.isEmpty && _cloudEntries.isEmpty) {
                  return Container(
                    padding: const EdgeInsets.all(24),
                    alignment: Alignment.center,
                    child: const Text('No ledger entries recorded yet.', style: TextStyle(color: Colors.grey)),
                  );
                }

                final recentCloud = _cloudEntries.take(10).toList();
                final recentInvoices = invoices.take(10).toList();
                final useCloud = recentCloud.isNotEmpty;

                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: useCloud ? recentCloud.length : recentInvoices.length,
                  separatorBuilder: (_, __) => const Divider(),
                  itemBuilder: (context, index) {
                    if (useCloud) {
                      final row = recentCloud[index];
                      final amount = _n(row['amount']);
                      final title = (row['description'] ?? row['reference'] ?? 'Ledger entry').toString();
                      final method = (row['channel'] ?? 'Quasar').toString();
                      DateTime? when;
                      try {
                        when = DateTime.tryParse('${row['created_at'] ?? ''}');
                      } catch (_) {}
                      final dateStr = when != null
                          ? DateFormat('MMM dd, hh:mm a').format(when.toLocal())
                          : '';
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Colors.orange.withOpacity(0.12),
                          child: Icon(
                            method.toLowerCase().contains('quasar') ||
                                    title.toLowerCase().contains('parent transfer')
                                ? Icons.account_balance
                                : Icons.receipt_long,
                            color: Colors.orange.shade800,
                            size: 20,
                          ),
                        ),
                        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
                        subtitle: Text('$method • $dateStr', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        trailing: Text(
                          '+${formatter.format(amount)}',
                          style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      );
                    }

                    final invoice = recentInvoices[index];
                    final dateStr = DateFormat('MMM dd, hh:mm a').format(invoice.dateCreated);
                    final method = paymentRailChannelLabel(invoice.paymentMethod);
                    
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Colors.blue.withOpacity(0.1),
                        child: const Icon(Icons.receipt_long, color: Colors.blue, size: 20),
                      ),
                      title: Text('$label #${invoice.invoiceNumber}', style: const TextStyle(fontWeight: FontWeight.w500)),
                      subtitle: Text('$method • $dateStr', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      trailing: Text(
                        '+${formatter.format(invoice.totalAmount)}', 
                        style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      onTap: () {
                        // Open stunning transaction details popup
                        _showTransactionDetailsPopup(context, invoice, label, currency);
                      },
                    );
                  },
                );
              },
            );
          },
        ),
      ],
    );
  }

  void _showTransactionDetailsPopup(BuildContext context, Invoice invoice, String label, String currency) {
    final formatter = NumberFormat.currency(symbol: currency, decimalDigits: 2);
    final dateStr = DateFormat('MMMM dd, yyyy • hh:mm a').format(invoice.dateCreated);
    final statusColor = invoice.paymentStatus == 'Paid' 
        ? Colors.green 
        : (invoice.paymentStatus == 'Partial' ? Colors.orange : Colors.red);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 20, offset: const Offset(0, -5)),
            ],
          ),
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 12,
            bottom: MediaQuery.of(context).padding.bottom + 20,
          ),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Subtle drag handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.grey.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              // Header Block with status badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$label #${invoice.invoiceNumber}',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          dateStr,
                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: statusColor.withOpacity(0.3)),
                    ),
                    child: Text(
                      invoice.paymentStatus.toUpperCase(),
                      style: TextStyle(
                        color: statusColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Overview metadata block
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.04),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.blue.withOpacity(0.1)),
                ),
                child: Column(
                  children: [
                    _buildDetailRow('Payment Method', invoice.paymentMethod ?? 'Cash'),
                    const SizedBox(height: 8),
                    _buildDetailRow('Cashier / Staff', invoice.staffName ?? 'Administrator'),
                    if (invoice.customerName != null && invoice.customerName!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      _buildDetailRow('Customer', invoice.customerName!),
                    ],
                    if (invoice.warrantyDuration != null && invoice.warrantyDuration!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      _buildDetailRow('Warranty Terms', invoice.warrantyDuration!),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Items Header
              const Text(
                'Purchased Items',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),

              // Items List
              Flexible(
                child: Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.withOpacity(0.2)),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: ListView.separated(
                    shrinkWrap: true,
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    itemCount: invoice.items.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, idx) {
                      final item = invoice.items[idx];
                      return ListTile(
                        dense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 0),
                        title: Text(
                          item.item.name,
                          style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
                        ),
                        subtitle: Text(
                          '${item.quantity} x ${formatter.format(item.unitPrice)}',
                          style: const TextStyle(color: Colors.grey, fontSize: 11),
                        ),
                        trailing: Text(
                          formatter.format(item.quantity * item.unitPrice),
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                        ),
                      );
                    },
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Payment History & Totals Block
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.grey.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Payment History Summary',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blueGrey),
                    ),
                    const SizedBox(height: 10),
                    _buildSummaryRow('Total Amount', formatter.format(invoice.totalAmount)),
                    const SizedBox(height: 6),
                    _buildSummaryRow('Amount Paid', formatter.format(invoice.amountPaid), color: Colors.green),
                    if (invoice.balanceAmount > 0) ...[
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 6.0),
                        child: Divider(height: 1),
                      ),
                      _buildSummaryRow(
                        'Outstanding Balance',
                        formatter.format(invoice.balanceAmount),
                        color: Colors.red,
                        isBold: true,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Full View History Button / Dismiss Button
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => Navigator.pop(context),
                      child: const Text('CLOSE'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        backgroundColor: Theme.of(context).colorScheme.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () {
                        // Dismiss popup and open full history page
                        Navigator.pop(context);
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const InvoiceHistoryPage()),
                        );
                      },
                      child: const Text('FULL VIEW'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
      ],
    );
  }

  Widget _buildSummaryRow(String label, String value, {Color? color, bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isBold ? 13 : 12,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
            color: isBold ? color : Colors.blueGrey.shade700,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isBold ? 15 : 13,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
            color: color ?? Colors.black87,
          ),
        ),
      ],
    );
  }
}

class _BalanceTile extends StatelessWidget {
  final String label;
  final String amount;
  final Color color;

  const _BalanceTile({required this.label, required this.amount, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        border: Border.all(color: color.withOpacity(0.2)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
          const SizedBox(height: 4),
          Text(amount, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }
}
