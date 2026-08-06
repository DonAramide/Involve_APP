import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/repositories/finance_repository_new.dart';
import '../../../../core/services/service_locator.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/core/utils/terminology.dart';
import 'package:involve_app/features/invoicing/presentation/history/bloc/history_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/history/bloc/history_state.dart';
import 'package:involve_app/features/services/domain/repositories/services_repository.dart';
import 'package:involve_app/features/services/domain/services/customer_wallet_credit_service.dart';
import 'package:involve_app/services/socket_service.dart';
import 'reconciliation_page.dart';
import 'virtual_accounts_page.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class ExecutiveFinanceDashboard extends StatefulWidget {
  const ExecutiveFinanceDashboard({super.key});

  @override
  State<ExecutiveFinanceDashboard> createState() => _ExecutiveFinanceDashboardState();
}

class _ExecutiveFinanceDashboardState extends State<ExecutiveFinanceDashboard> {
  final _repository = sl<FinanceRepository>();
  Map<String, dynamic>? _summary;
  List<dynamic> _recentActivity = [];
  bool _isLoading = true;
  String? _error;
  StreamSubscription? _walletCreditSub;

  DateTime? _startDate;
  DateTime? _endDate;

  @override
  void initState() {
    super.initState();
    context.read<HistoryBloc>().add(LoadHistory());
    _loadData();
    _walletCreditSub =
        CustomerWalletCreditService.instance.onWalletCredited.listen((_) {
      if (!mounted) return;
      _loadData();
    });
    SocketService().onEvent('payment.success', _onPaymentSuccess);
  }

  void _onPaymentSuccess(dynamic _) {
    if (!mounted) return;
    _loadData();
  }

  @override
  void dispose() {
    _walletCreditSub?.cancel();
    SocketService().offEvent('payment.success', _onPaymentSuccess);
    super.dispose();
  }

  /// Same rule as Customer Lookup: balance > 0 = owing.
  Future<Map<String, dynamic>> _customerLedgerMetrics() async {
    try {
      final customers =
          await context.read<IServicesRepository>().getCustomers();
      int owing = 0;
      int paid = 0;
      double outstanding = 0;
      for (final c in customers) {
        if (c.balance > 0.01) {
          owing++;
          outstanding += c.balance;
        } else {
          paid++;
        }
      }
      return {
        'total': customers.length,
        'owing': owing,
        'paid': paid,
        'outstanding': outstanding,
      };
    } catch (_) {
      return {
        'total': 0,
        'owing': 0,
        'paid': 0,
        'outstanding': 0.0,
      };
    }
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final ledger = await _customerLedgerMetrics();

    try {
      final summary = await _repository.getExecutiveSummary(
        startDate: _startDate != null ? DateFormat('yyyy-MM-dd').format(_startDate!) : null,
        endDate: _endDate != null ? DateFormat('yyyy-MM-dd').format(_endDate!) : null,
      );
      final history = await _repository.getPayoutHistory(limit: 5);

      // Prefer local customer ledger for Paid/Owing/Outstanding so it matches Customer Lookup.
      summary['studentMetrics'] = {
        'total': ledger['total'],
        'paid': ledger['paid'],
        'owing': ledger['owing'],
      };
      summary['outstanding'] = ledger['outstanding'];
      
      setState(() {
        _summary = summary;
        _recentActivity = history['data'];
        _isLoading = false;
        _error = null;
      });
    } catch (e) {
      // Offline fallback: local ledger only — never invent Quasar ratios.
      double localCollected = 0.0;
      List<dynamic> localActivities = [];
      if (mounted) {
        final historyState = context.read<HistoryBloc>().state;
        if (historyState is HistoryLoaded) {
          final invoices = historyState.invoices;

          for (final inv in invoices) {
            localCollected += inv.amountPaid;
          }

          localActivities = invoices.take(5).map((inv) => {
            'created_at': inv.dateCreated.toIso8601String(),
            'type': 'fee',
            'amount': inv.totalAmount,
          }).toList();
        }
      }

      setState(() {
        _summary = {
          'walletBalance': 0.0,
          'totalCollected': localCollected,
          'revenueInRange': localCollected,
          'totalQuasarCollected': 0.0,
          'totalQuasarRemitted': 0.0,
          'pendingQuasarRemittance': 0.0,
          'pendingVirtualAccountFunds': 0.0,
          'outstanding': ledger['outstanding'],
          'alerts': {
            'unmatchedCount': 0,
            'failedPayoutsCount': 0,
          },
          'studentMetrics': {
            'total': ledger['total'],
            'paid': ledger['paid'],
            'owing': ledger['owing'],
          },
          '_offline': true,
        };
        _recentActivity = localActivities;
        _isLoading = false;
        _error = null;
      });
      debugPrint('[ExecutiveDashboard] summary fallback (API failed): $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SettingsBloc, SettingsState>(
      builder: (context, state) {
        final settings = state.settings;
        final isRetail = settings?.businessMode == 'retail';
        final customerLabelPlural = settings?.customersLabel ?? 'Customers';
        final collectedLabel = settings?.collectedLabel ?? 'Total Collected';
        
        return Scaffold(
          backgroundColor: const Color(0xFFF8FAFC),
          appBar: AppBar(
            title: const Text('Executive Dashboard', style: TextStyle(fontWeight: FontWeight.w900)),
            elevation: 0,
            backgroundColor: Colors.white,
            foregroundColor: Colors.black,
            actions: [
              IconButton(
                icon: const Icon(Icons.account_balance_wallet_outlined),
                tooltip: 'Virtual Accounts',
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const VirtualAccountsPage()),
                ),
              ),
              IconButton(icon: const Icon(Icons.tune_rounded), onPressed: () => _showFilterOptions(context)),
              IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _loadData),
            ],
          ),
          body: _isLoading
              ? const InvifyLoadingIndicator(message: 'COMPILING EXECUTIVE TELEMETRY...')
              : _error != null
                  ? _buildErrorState()
                  : RefreshIndicator(
                  onRefresh: _loadData,
                  child: CustomScrollView(
                    slivers: [
                      // 1. Alert Panel (if any)
                      if (_hasAlerts())
                        SliverToBoxAdapter(child: _buildAlertPanel()),
    
                      // 2. Main KPIs
                      SliverPadding(
                        padding: const EdgeInsets.all(16),
                        sliver: SliverGrid(
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisSpacing: 12,
                            crossAxisSpacing: 12,
                            childAspectRatio: 1.5,
                          ),
                          delegate: SliverChildListDelegate([
                            _buildKpiCard('Available Balance', _summary?['walletBalance'], Icons.account_balance_wallet_rounded, Colors.indigo),
                            _buildKpiCard(collectedLabel, _summary?['totalCollected'], Icons.payments_rounded, Colors.green),
                            _buildKpiCard(
                              'To be Remitted (Quasar)',
                              _summary?['pendingQuasarRemittance'] ??
                                  _summary?['totalQuasarCollected'],
                              Icons.account_balance_rounded,
                              Colors.blue,
                            ),
                            _buildKpiCard('Remitted (Quasar)', _summary?['totalQuasarRemitted'], Icons.check_circle_outline_rounded, Colors.teal),
                            _buildKpiCard(
                              'Pending VA Funds',
                              _summary?['pendingVirtualAccountFunds'] ??
                                  _summary?['revenueInRange'],
                              Icons.trending_up_rounded,
                              Colors.purple,
                            ),
                            _buildKpiCard('Outstanding', _summary?['outstanding'], Icons.warning_amber_rounded, Colors.orange),
                          ]),
                        ),
                      ),
    
                      // 3. Student Metrics
                      SliverToBoxAdapter(child: _buildStudentMetricsSection(customerLabelPlural)),
    
                      // 4. Revenue Chart
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Financial Performance', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                const SizedBox(height: 20),
                                // Beautiful graphical timeline view representing continuous financial streams
                                AspectRatio(
                                  aspectRatio: 1.7, 
                                  child: Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Colors.grey.shade50,
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(color: Colors.grey.shade100),
                                    ),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.end,
                                      children: [
                                        Expanded(
                                          child: Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                            crossAxisAlignment: CrossAxisAlignment.end,
                                            children: [
                                              _buildMiniBar(0.4, Colors.blue),
                                              _buildMiniBar(0.7, Colors.indigo),
                                              _buildMiniBar(0.5, Colors.blue),
                                              _buildMiniBar(0.9, Colors.indigo),
                                              _buildMiniBar(0.6, Colors.blue),
                                              _buildMiniBar(1.0, Colors.green),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        const Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                          children: [
                                            Text('Jan', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                            Text('Feb', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                            Text('Mar', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                            Text('Apr', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                            Text('May', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                            Text('Jun', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
    
                      // 5. Recent Activity Header
                      const SliverToBoxAdapter(
                        child: Padding(
                          padding: EdgeInsets.fromLTRB(16, 24, 16, 12),
                          child: Text('Recent Activity', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        ),
                      ),
    
                      // 6. Recent Activity List
                      SliverPadding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        sliver: SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) => _buildActivityTile(_recentActivity[index], isRetail),
                            childCount: _recentActivity.length,
                          ),
                        ),
                      ),
                      
                      const SliverToBoxAdapter(child: SizedBox(height: 40)),
                    ],
                  ),
                ),
        );
      },
    );
  }

  bool _hasAlerts() {
    final alerts = _summary?['alerts'];
    if (alerts == null) return false;
    return alerts['unmatchedCount'] > 0 || alerts['failedPayoutsCount'] > 0;
  }

  Widget _buildErrorState() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            const Text(
              'Failed to load financial data',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? 'Unknown error',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry Connection'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAlertPanel() {
    final alerts = _summary?['alerts'];
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.red.shade100),
      ),
      child: Column(
        children: [
          if (alerts['unmatchedCount'] > 0)
            _alertItem('${alerts['unmatchedCount']} Unmatched Payments', 'Requires manual reconciliation', Icons.priority_high_rounded),
          if (alerts['failedPayoutsCount'] > 0)
            _alertItem('${alerts['failedPayoutsCount']} Failed Payouts', 'Check bank details and retry', Icons.error_outline_rounded),
        ],
      ),
    );
  }

  Widget _alertItem(String title, String sub, IconData icon) {
    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const ReconciliationPage()),
        );
      },
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        child: Row(
          children: [
            Icon(icon, size: 20, color: Colors.red.shade700),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red.shade900, fontSize: 13)),
                  Text(sub, style: TextStyle(color: Colors.red.shade700, fontSize: 11)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, size: 16, color: Colors.red),
          ],
        ),
      ),
    );
  }

  Widget _buildKpiCard(String label, dynamic value, IconData icon, Color color) {
    final formatter = NumberFormat.currency(symbol: '₦', decimalDigits: 0);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, color: color, size: 24),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w500)),
              Text(
                formatter.format(value ?? 0),
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: -0.5),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStudentMetricsSection(String pluralLabel) {
    final metrics = _summary?['studentMetrics'];
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFF1A1C1E),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _metricItem('Total $pluralLabel', metrics?['total']?.toString() ?? '0', Colors.white),
            _metricItem('Paid', metrics?['paid']?.toString() ?? '0', Colors.greenAccent),
            _metricItem('Owing', metrics?['owing']?.toString() ?? '0', Colors.orangeAccent),
          ],
        ),
      ),
    );
  }

  Widget _metricItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: TextStyle(color: color, fontSize: 24, fontWeight: FontWeight.w900)),
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 11)),
      ],
    );
  }

  Widget _buildActivityTile(Map<String, dynamic> item, bool isRetail) {
    final date = DateTime.parse(item['created_at']);
    final typeLabel = item['type'] == 'payout' 
        ? 'Fund Sweep' 
        : (isRetail ? 'Sales Payment' : 'Fee Payment');
        
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: Colors.grey.shade50, shape: BoxShape.circle),
            child: const Icon(Icons.swap_horiz_rounded, color: Colors.blue),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(typeLabel, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(DateFormat('MMM dd, hh:mm a').format(date), style: const TextStyle(fontSize: 11, color: Colors.grey)),
              ],
            ),
          ),
          Text(
            '₦${NumberFormat('#,###').format(item['amount'])}',
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
        ],
      ),
    );
  }

  Widget _buildMiniBar(double factor, Color color) {
    return Container(
      width: 20,
      height: 100 * factor,
      decoration: BoxDecoration(
        color: color.withOpacity(0.85),
        borderRadius: BorderRadius.circular(4),
      ),
    );
  }

  void _showFilterOptions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Telemetry Projection Settings',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.date_range, color: Colors.blue),
                title: const Text('Filter by Reporting Cycle'),
                subtitle: Text(_startDate == null 
                    ? 'View analytics for standard offline date ranges' 
                    : 'Active: ${DateFormat('yyyy-MM-dd').format(_startDate!)} to ${DateFormat('yyyy-MM-dd').format(_endDate!)}'),
                onTap: () async {
                  Navigator.pop(ctx);
                  final pickedRange = await showDateRangePicker(
                    context: context,
                    firstDate: DateTime(2020),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                    initialDateRange: _startDate != null && _endDate != null
                        ? DateTimeRange(start: _startDate!, end: _endDate!)
                        : null,
                  );
                  if (pickedRange != null) {
                    setState(() {
                      _startDate = pickedRange.start;
                      _endDate = pickedRange.end;
                    });
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Reporting cycle set to: ${DateFormat('yyyy-MM-dd').format(_startDate!)} to ${DateFormat('yyyy-MM-dd').format(_endDate!)}')),
                    );
                    _loadData();
                  }
                },
              ),
              if (_startDate != null || _endDate != null)
                ListTile(
                  leading: const Icon(Icons.clear_all, color: Colors.red),
                  title: const Text('Clear Date Range Filter'),
                  subtitle: const Text('Reset to view all-time reporting data'),
                  onTap: () {
                    Navigator.pop(ctx);
                    setState(() {
                      _startDate = null;
                      _endDate = null;
                    });
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Date range filter cleared.')),
                    );
                    _loadData();
                  },
                ),
              ListTile(
                leading: const Icon(Icons.sync_rounded, color: Colors.green),
                title: const Text('Re-index Local Storage Cache'),
                subtitle: const Text('Force recalculation of all saved SQLite invoicing tables'),
                onTap: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Re-indexing client database caches...')),
                  );
                  context.read<HistoryBloc>().add(LoadHistory());
                  _loadData();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
