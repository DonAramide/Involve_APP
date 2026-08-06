import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/finance_bloc.dart';
import '../../domain/repositories/finance_repository_new.dart';
import '../widgets/summary_stat_card.dart';
import '../widgets/modern_revenue_chart.dart';
import '../widgets/global_transaction_tile.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/utils/terminology.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';
import 'virtual_accounts_page.dart';

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
    final settings = context.read<SettingsBloc>().state.settings;
    final membersLabel = settings?.customersLabel ?? 'Customers';

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
          TextButton.icon(
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const VirtualAccountsPage()),
            ),
            icon: const Icon(Icons.account_balance_wallet_outlined, size: 18),
            label: const Text('Virtual Accounts'),
            style: TextButton.styleFrom(
              foregroundColor: Colors.indigo.shade700,
              padding: const EdgeInsets.symmetric(horizontal: 12),
            ),
          ),
          TextButton.icon(
            onPressed: () => _showWithdrawalModal(),
            icon: const Icon(Icons.account_balance_rounded, size: 18),
            label: const Text('Withdraw'),
            style: TextButton.styleFrom(
              foregroundColor: Colors.blue.shade700,
              padding: const EdgeInsets.symmetric(horizontal: 12),
            ),
          ),
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
            return const InvifyLoadingIndicator(message: 'GATHERING FINANCE LEDGERS...');
          }

          if (state is FinanceError) {
            final isNetwork = state.message.toLowerCase().contains('connection') || state.message.toLowerCase().contains('internet');
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      isNetwork ? Icons.cloud_off_rounded : Icons.error_outline_rounded,
                      size: 64,
                      color: Colors.blueGrey.shade400,
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Connection Issue',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blueGrey),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      state.message.replaceAll('Exception: ', '').replaceAll('FinanceApiException: ', ''),
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 14, color: Colors.grey.shade600, height: 1.4),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: () => context.read<FinanceBloc>().add(LoadSchoolDashboard()),
                      icon: const Icon(Icons.refresh_rounded, size: 18),
                      label: const Text('Retry'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ),
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
                          subtitle: settings?.businessMode == 'school' ? 'Due Fees' : 'Pending',
                        ),
                        SummaryStatCard(
                          title: 'Paid $membersLabel',
                          value: summary.paidStudentsCount.toString(),
                          icon: Icons.check_circle_outline,
                          color: Colors.green,
                        ),
                        SummaryStatCard(
                          title: 'Owing $membersLabel',
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

  bool _isWithdrawing = false;

  void _showWithdrawalModal() async {
    final repo = context.read<FinanceRepository>();
    
    showDialog(
      context: context,
      builder: (_) => const InvifyLoadingIndicator(message: 'PREPARING SECURE PAYOUT...'),
    );

    try {
      final settings = await repo.getPayoutSettings();
      final summary = (context.read<FinanceBloc>().state as FinanceDashboardLoaded).summary;
      
      if (mounted) Navigator.pop(context); 

      if (settings.isEmpty) {
        _showError('No bank account configured. Please set one up in Settings.');
        return;
      }

      final amountController = TextEditingController();

      if (mounted) {
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (context) => Container(
            padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Initiate Withdrawal', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 22)),
                  const SizedBox(height: 8),
                  Text('Funds will be sent to ${settings['bank_name']}', style: const TextStyle(color: Colors.grey)),
                  const SizedBox(height: 24),
                  
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.account_balance, color: Colors.blue),
                        const SizedBox(width: 16),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(settings['account_name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                            Text('${settings['account_number']} • ${settings['bank_name']}', style: const TextStyle(fontSize: 12)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  Text(
                    'Available: ₦${NumberFormat('#,###').format(summary.totalRevenue)}',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green),
                  ),
                  const SizedBox(height: 12),
                  
                  TextField(
                    controller: amountController,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                    decoration: InputDecoration(
                      hintText: '0.00',
                      prefixText: '₦ ',
                      filled: true,
                      fillColor: const Color(0xFFF1F3F5),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: () {
                        final amt = double.tryParse(amountController.text) ?? 0;
                        if (amt <= 0 || amt > summary.totalRevenue) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invalid amount or insufficient balance')));
                          return;
                        }
                        Navigator.pop(context);
                        _confirmWithdrawal(amt);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1A1C1E),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: const Text('Confirm Withdrawal', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) Navigator.pop(context);
      _showError('Failed to prepare withdrawal: $e');
    }
  }

  void _confirmWithdrawal(double amount) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Final Confirmation'),
        content: Text('Are you sure you want to withdraw ₦${NumberFormat('#,###').format(amount)} to your saved bank account? This action cannot be reversed.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _performWithdrawal(amount);
            },
            child: const Text('Withdraw Now'),
          ),
        ],
      ),
    );
  }

  Future<void> _performWithdrawal(double amount) async {
    setState(() => _isWithdrawing = true);
    try {
      await context.read<FinanceRepository>().initiatePayout(amount);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Withdrawal initiated successfully!'), backgroundColor: Colors.green));
        context.read<FinanceBloc>().add(RefreshDashboardSummary());
      }
    } catch (e) {
      if (mounted) _showError('Withdrawal failed: $e');
    } finally {
      if (mounted) setState(() => _isWithdrawing = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.red));
  }
}
