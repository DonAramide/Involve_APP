import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/finance_bloc.dart';
import '../widgets/summary_stat_card.dart';
import '../widgets/modern_revenue_chart.dart';
import '../widgets/global_transaction_tile.dart';
import 'package:intl/intl.dart';

class SchoolFinanceDashboardPage extends StatefulWidget {
  const SchoolFinanceDashboardPage({super.key});

  @override
  State<SchoolFinanceDashboardPage> createState() => _SchoolFinanceDashboardPageState();
}

class _SchoolFinanceDashboardPageState extends State<SchoolFinanceDashboardPage> {
  int _chartFilterDays = 7;

  @override
  void initState() {
    super.initState();
    context.read<FinanceBloc>().add(LoadSchoolDashboard());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Finance Dashboard',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<FinanceBloc>().add(RefreshDashboardSummary()),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: BlocBuilder<FinanceBloc, FinanceState>(
        builder: (context, state) {
          if (state is FinanceLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is FinanceError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(state.message),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context.read<FinanceBloc>().add(LoadSchoolDashboard()),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (state is FinanceDashboardLoaded) {
            final summary = state.summary;
            return RefreshIndicator(
              onRefresh: () async {
                context.read<FinanceBloc>().add(RefreshDashboardSummary());
              },
              child: CustomScrollView(
                slivers: [
                  // 1. Stats Grid
                  SliverPadding(
                    padding: const EdgeInsets.all(16),
                    sliver: SliverGrid(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 1.4,
                      ),
                      delegate: SliverChildListDelegate([
                        SummaryStatCard(
                          title: 'Total Revenue',
                          value: '₦${NumberFormat('#,###').format(summary.totalRevenue)}',
                          icon: Icons.account_balance_wallet,
                          color: Colors.blue,
                          subtitle: 'Current Year',
                        ),
                        SummaryStatCard(
                          title: 'Outstanding',
                          value: '₦${NumberFormat('#,###').format(summary.outstandingFees)}',
                          icon: Icons.warning_amber_rounded,
                          color: Colors.orange,
                          subtitle: 'Due Fees',
                        ),
                        SummaryStatCard(
                          title: 'Paid Students',
                          value: summary.paidStudentsCount.toString(),
                          icon: Icons.check_circle_outline,
                          color: Colors.green,
                        ),
                        SummaryStatCard(
                          title: 'Owing Students',
                          value: summary.owingStudentsCount.toString(),
                          icon: Icons.people_outline,
                          color: Colors.red,
                        ),
                      ]),
                    ),
                  ),

                  // 2. Revenue Chart Section
                  SliverToBoxAdapter(
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Revenue Performance',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                              _buildChartFilter(),
                            ],
                          ),
                          const SizedBox(height: 24),
                          ModernRevenueChart(
                            data: state.chartData,
                            isLoading: state.isRefreshing,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // 3. Transactions Feed Header
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(16, 24, 16, 12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Live Transactions',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          Text(
                            'See All',
                            style: TextStyle(color: Colors.blue, fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // 4. Transactions List
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final tx = state.transactions[index];
                          return GlobalTransactionTile(transaction: tx);
                        },
                        childCount: state.transactions.length,
                      ),
                    ),
                  ),

                  const SliverToBoxAdapter(child: SizedBox(height: 32)),
                ],
              ),
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildChartFilter() {
    return Container(
      height: 32,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          _filterButton('7D', 7),
          _filterButton('30D', 30),
          _filterButton('Term', 90), // Mock 90 days for term
        ],
      ),
    );
  }

  Widget _filterButton(String label, int days) {
    final isSelected = _chartFilterDays == days;
    return GestureDetector(
      onTap: () {
        setState(() => _chartFilterDays = days);
        context.read<FinanceBloc>().add(LoadChartData(days: days));
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  )
                ]
              : null,
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              color: isSelected ? Colors.black : Colors.grey.shade600,
            ),
          ),
        ),
      ),
    );
  }
}
