// lib/features/school_finance/presentation/pages/executive_finance_dashboard.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/repositories/finance_repository_new.dart';
import '../../../../core/services/service_locator.dart';
import '../widgets/summary_stat_card.dart';
import '../widgets/modern_revenue_chart.dart';
import '../widgets/global_transaction_tile.dart';
import 'package:intl/intl.dart';

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

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final summary = await _repository.getExecutiveSummary();
      // Also fetch recent transactions
      final history = await _repository.getPayoutHistory(limit: 5);
      
      setState(() {
        _summary = summary;
        _recentActivity = history['data'];
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Executive Dashboard', style: TextStyle(fontWeight: FontWeight.w900)),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        actions: [
          IconButton(icon: const Icon(Icons.tune_rounded), onPressed: () {}),
          IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _loadData),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
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
                        _buildKpiCard('Total Collected', _summary?['totalCollected'], Icons.payments_rounded, Colors.green),
                        _buildKpiCard('Revenue (Range)', _summary?['revenueInRange'], Icons.trending_up_rounded, Colors.blue),
                        _buildKpiCard('Outstanding', 0, Icons.warning_amber_rounded, Colors.orange),
                      ]),
                    ),
                  ),

                  // 3. Student Metrics
                  SliverToBoxAdapter(child: _buildStudentMetricsSection()),

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
                            const AspectRatio(aspectRatio: 1.7, child: Placeholder()), // Chart placeholder
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
                        (context, index) => _buildActivityTile(_recentActivity[index]),
                        childCount: _recentActivity.length,
                      ),
                    ),
                  ),
                  
                  const SliverToBoxAdapter(child: SizedBox(height: 40)),
                ],
              ),
            ),
    );
  }

  bool _hasAlerts() {
    final alerts = _summary?['alerts'];
    if (alerts == null) return false;
    return alerts['unmatchedCount'] > 0 || alerts['failedPayoutsCount'] > 0;
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
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
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

  Widget _buildStudentMetricsSection() {
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
            _metricItem('Total Students', metrics?['total'].toString() ?? '0', Colors.white),
            _metricItem('Paid', '0', Colors.greenAccent),
            _metricItem('Owing', '0', Colors.orangeAccent),
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

  Widget _buildActivityTile(Map<String, dynamic> item) {
    final date = DateTime.parse(item['created_at']);
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
                Text(item['type'] == 'payout' ? 'Fund Sweep' : 'Fee Payment', style: const TextStyle(fontWeight: FontWeight.bold)),
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
}
