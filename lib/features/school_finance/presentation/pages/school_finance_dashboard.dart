import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import '../bloc/finance_bloc.dart';
import '../../domain/entities/school_financial_summary.dart';
import '../../domain/repositories/finance_repository_new.dart';
import '../widgets/summary_stat_card.dart';
import '../widgets/modern_revenue_chart.dart';
import '../widgets/global_transaction_tile.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/core/utils/terminology.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:flutter/services.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';
import 'dart:async';
import 'package:involve_app/services/socket_service.dart';
import 'virtual_accounts_page.dart';
import '../withdrawal_confirmation_copy.dart';

final TextInputFormatter _koboAmountFormatter = TextInputFormatter.withFunction((oldValue, newValue) {
  final text = newValue.text;
  if (text.isEmpty || RegExp(r'^\d+\.?\d{0,2}$').hasMatch(text) || RegExp(r'^\.\d{0,2}$').hasMatch(text)) {
    return newValue;
  }
  return oldValue;
});

double _koboAmount(String raw) {
  final value = double.tryParse(raw.trim()) ?? 0;
  return (value * 100).round() / 100;
}

class SchoolFinanceDashboardPage extends StatefulWidget {
  const SchoolFinanceDashboardPage({super.key});

  @override
  State<SchoolFinanceDashboardPage> createState() => _SchoolFinanceDashboardPageState();
}

class _SchoolFinanceDashboardPageState extends State<SchoolFinanceDashboardPage> {
  int _chartFilterDays = 7;
  FinanceDashboardLoaded? _lastDashboard;
  StreamSubscription<double>? _withdrawableSub;

  @override
  void initState() {
    super.initState();
    context.read<FinanceBloc>().add(LoadSchoolDashboard());
    _withdrawableSub = SocketService.withdrawableUpdates.stream.listen((available) {
      if (!mounted) return;
      final current = _lastDashboard?.summary.withdrawable;
      if (current != null && (current - available).abs() < 0.01) return;
      context.read<FinanceBloc>().add(RefreshDashboardSummary());
    });
  }

  @override
  void dispose() {
    _withdrawableSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final settings = context.read<SettingsBloc>().state.settings;
    final membersLabel = settings?.customersLabel ?? 'Customers';

    return Scaffold(
      backgroundColor: isDark ? theme.scaffoldBackgroundColor : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          'Finance Dashboard',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 18,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
        backgroundColor: isDark ? theme.colorScheme.surface : Colors.white,
        foregroundColor: isDark ? Colors.white : Colors.black,
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
              foregroundColor: isDark ? Colors.indigo.shade200 : Colors.indigo.shade700,
              padding: const EdgeInsets.symmetric(horizontal: 12),
            ),
          ),
          TextButton.icon(
            onPressed: () => _showWithdrawalModal(),
            icon: const Icon(Icons.account_balance_rounded, size: 18),
            label: const Text('Withdraw'),
            style: TextButton.styleFrom(
              foregroundColor: isDark ? Colors.blue.shade300 : Colors.blue.shade700,
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
          if (state is FinanceDashboardLoaded) {
            _lastDashboard = state;
          }

          if (state is FinanceLoading && _lastDashboard == null) {
            return const InvifyLoadingIndicator(message: 'GATHERING FINANCE LEDGERS...');
          }

          if (state is FinanceError && _lastDashboard == null) {
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
                      friendlyApiError(state.message, fallback: 'Could not load finance data.'),
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

          final dashboard = state is FinanceDashboardLoaded ? state : _lastDashboard;
          if (dashboard != null) {
            final summary = dashboard.summary;
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
                          value: CurrencyFormatter.formatWithSymbol(summary.totalRevenue),
                          icon: Icons.account_balance_wallet,
                          color: Colors.blue,
                          subtitle: 'Billed collections',
                        ),
                        SummaryStatCard(
                          title: 'Outstanding',
                          value: CurrencyFormatter.formatWithSymbol(summary.outstandingFees),
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

                  SliverToBoxAdapter(
                    child: _buildQuasarStrip(summary, isDark, theme),
                  ),

                  // 2. Revenue Chart Section
                  SliverToBoxAdapter(
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark ? theme.cardColor : Colors.white,
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
                            data: dashboard.chartData,
                            isLoading: dashboard.isRefreshing,
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
                          final tx = dashboard.transactions[index];
                          return GlobalTransactionTile(transaction: tx);
                        },
                        childCount: dashboard.transactions.length,
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

  Widget _buildQuasarStrip(SchoolFinancialSummary summary, bool isDark, ThemeData theme) {
    Widget cell(String label, double amount, Color color) {
      return Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              CurrencyFormatter.formatWithSymbol(amount),
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? theme.cardColor : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: (isDark ? Colors.indigo.shade200 : Colors.indigo.shade100)
              .withOpacity(0.6),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Quasar',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Card plus virtual-account transfers held with Quasar. A parent-wallet bill is not included here.',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              cell('Card', summary.cardCollected, Colors.purple),
              Container(
                width: 1,
                height: 36,
                color: isDark ? theme.dividerColor : Colors.grey.shade200,
              ),
              const SizedBox(width: 12),
              cell('Transfer', summary.vaTransferCollected, Colors.indigo),
              Container(
                width: 1,
                height: 36,
                color: isDark ? theme.dividerColor : Colors.grey.shade200,
              ),
              const SizedBox(width: 12),
              cell('Quasar', summary.quasarCardAndTransfer, Colors.teal),
            ],
          ),
          if (summary.needsVaInvestigation) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFB91C1C),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                'Investigate: Invify logged ${CurrencyFormatter.formatWithSymbol(summary.invifyLoggedVa)} '
                'is higher than live Quasar ${CurrencyFormatter.formatWithSymbol(summary.quasarLiveBalance ?? summary.vaTransferCollected)}. '
                'This is usually a double sync (tablet + webhook). Showing live Quasar.',
                style: const TextStyle(color: Colors.white, fontSize: 12, height: 1.35),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildChartFilter() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Container(
      height: 32,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: isDark ? theme.colorScheme.surfaceContainerHighest : Colors.grey.shade100,
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
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isSelected = _chartFilterDays == days;
    return GestureDetector(
      onTap: () {
        setState(() => _chartFilterDays = days);
        context.read<FinanceBloc>().add(LoadChartData(days: days));
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: isSelected ? (isDark ? theme.cardColor : Colors.white) : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: isDark ? Colors.black26 : Colors.black.withOpacity(0.05),
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
              color: isSelected
                  ? (isDark ? Colors.white : Colors.black)
                  : (isDark ? Colors.grey.shade400 : Colors.grey.shade600),
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
      barrierDismissible: false,
      builder: (_) => const PopScope(
        canPop: false,
        child: Dialog(
          backgroundColor: Colors.transparent,
          elevation: 0,
          child: InvifyLoadingIndicator(message: ''),
        ),
      ),
    );

    try {
      final settings = await repo.getPayoutSettings();
      final blocState = context.read<FinanceBloc>().state;
      final summary = blocState is FinanceDashboardLoaded
          ? blocState.summary
          : _lastDashboard?.summary;
      if (blocState is! FinanceDashboardLoaded) {
        context.read<FinanceBloc>().add(LoadSchoolDashboard());
      }

      if (mounted) Navigator.pop(context);

      if (summary == null) {
        _showError('Could not load wallet totals. Please refresh and try again.');
        return;
      } 

      final payout = settings['settings'] is Map
          ? Map<String, dynamic>.from(settings['settings'] as Map)
          : settings;
      final accountNumber = (payout['account_number'] ?? payout['accountNumber'] ?? '').toString().trim();
      if (accountNumber.isEmpty) {
        _showError('No bank account configured. Please set one up in Settings.');
        return;
      }

      final amountController = TextEditingController();

      if (mounted) {
        final theme = Theme.of(context);
        final isDark = theme.brightness == Brightness.dark;
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (context) => Container(
            padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
            decoration: BoxDecoration(
              color: isDark ? theme.colorScheme.surface : Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Initiate Withdrawal', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 22)),
                  const SizedBox(height: 8),
                  Text('Funds will be sent to ${payout['bank_name'] ?? payout['bankName'] ?? 'your saved bank'}', style: TextStyle(color: isDark ? Colors.grey.shade400 : Colors.grey)),
                  const SizedBox(height: 24),
                  
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? theme.colorScheme.surfaceContainerHighest : Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.account_balance, color: isDark ? Colors.blue.shade300 : Colors.blue),
                        const SizedBox(width: 16),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(payout['account_name'] ?? payout['accountName'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                            Text('${payout['account_number'] ?? payout['accountNumber']} • ${payout['bank_name'] ?? payout['bankName'] ?? ''}', style: TextStyle(fontSize: 12, color: isDark ? Colors.grey.shade400 : Colors.grey.shade700)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  Text(
                    'Available: ${CurrencyFormatter.formatWithSymbol(summary.withdrawable)}',
                    style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? Colors.greenAccent : Colors.green),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Card, parent wallet, and school VA already used on bills. '
                    'Charges come off this school wallet when you withdraw, not off the parent virtual account. '
                    'Unused parent credit is not included.',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade700,
                    ),
                  ),
                  const SizedBox(height: 12),
                  
                  TextField(
                    controller: amountController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [_koboAmountFormatter],
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                    decoration: InputDecoration(
                      hintText: '0.00',
                      prefixText: '₦ ',
                      filled: true,
                      fillColor: isDark ? theme.colorScheme.surfaceContainerHighest : const Color(0xFFF1F3F5),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: () async {
                        final amt = _koboAmount(amountController.text);
                        if (amt <= 0 || amt > summary.withdrawable) {
                          _showError('Enter an amount above zero that is not more than the available balance.');
                          return;
                        }
                        showDialog(
                          context: context,
                          barrierDismissible: false,
                          builder: (_) => const PopScope(
                            canPop: false,
                            child: Dialog(
                              backgroundColor: Colors.transparent,
                              elevation: 0,
                              child: InvifyLoadingIndicator(message: ''),
                            ),
                          ),
                        );
                        try {
                          final quote = await repo.quotePayout(amt);
                          if (mounted) Navigator.pop(context);
                          if (!mounted) return;
                          Navigator.pop(context);
                          _confirmWithdrawal(amt, quote, payout);
                        } catch (e) {
                          if (mounted) Navigator.pop(context);
                          _showError(friendlyApiError(e, fallback: 'Could not calculate the service fee.'));
                        }
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
      _showError(friendlyApiError(e, fallback: 'Could not prepare withdrawal.'));
    }
  }

  Widget _confirmAmountLine(String label, String value, Color ink) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: ink)),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: ink)),
      ],
    );
  }

  void _confirmWithdrawal(double amount, Map<String, dynamic> quote, Map<String, dynamic> payout) {
    final codeController = TextEditingController();
    final fee = double.tryParse('${quote['service_fee'] ?? 0}') ?? 0;
    final total = double.tryParse('${quote['total_required'] ?? (amount + fee)}') ?? (amount + fee);
    showDialog(
      context: context,
      builder: (dialogContext) {
        final theme = Theme.of(dialogContext);
        final isDark = theme.brightness == Brightness.dark;
        final ink = isDark ? theme.colorScheme.onSurface : const Color(0xFF1A1C1E);
        final fill = isDark ? theme.colorScheme.surfaceContainerHighest : const Color(0xFFF1F3F5);
        return AlertDialog(
          titlePadding: const EdgeInsets.fromLTRB(28, 28, 28, 4),
          contentPadding: const EdgeInsets.fromLTRB(28, 12, 28, 8),
          actionsPadding: const EdgeInsets.fromLTRB(20, 8, 20, 22),
          title: Text(
            'Final Confirmation',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 24, height: 1.2, color: ink),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _confirmAmountLine('Amount to your bank', CurrencyFormatter.formatWithSymbol(amount), ink),
                const SizedBox(height: 16),
                _confirmAmountLine('Service fee', CurrencyFormatter.formatWithSymbol(fee), ink),
                const SizedBox(height: 18),
                Text(
                  'Total from available balance',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: ink),
                ),
                const SizedBox(height: 4),
                Text(
                  CurrencyFormatter.formatWithSymbol(total),
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 22, color: ink),
                ),
                const SizedBox(height: 20),
                Text(
                  'This action cannot be reversed.',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, height: 1.35, color: ink),
                ),
                const SizedBox(height: 22),
                Text(
                  'Enter the 6-digit code from your authenticator app.',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, height: 1.35, color: ink),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: codeController,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  maxLength: 6,
                  autofocus: true,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 6,
                    color: ink,
                  ),
                  decoration: InputDecoration(
                    labelText: 'Authenticator code',
                    labelStyle: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: ink.withValues(alpha: 0.72)),
                    floatingLabelStyle: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: ink),
                    counterText: '',
                    filled: true,
                    fillColor: fill,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 22),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: ink, width: 1.6),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: ink, width: 1.8),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: ink, width: 2.6),
                    ),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                foregroundColor: ink,
                textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
              ),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                final code = codeController.text.trim();
                if (code.length != 6) {
                  _showError('Enter the 6-digit authenticator code.');
                  return;
                }
                Navigator.pop(dialogContext);
                _performWithdrawal(amount, code, quote, payout);
              },
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
                backgroundColor: const Color(0xFF1A1C1E),
                foregroundColor: Colors.white,
                textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('Withdraw Now'),
            ),
          ],
        );
      },
    ).whenComplete(codeController.dispose);
  }

  Future<void> _performWithdrawal(
    double amount,
    String otp,
    Map<String, dynamic> quote,
    Map<String, dynamic> payout,
  ) async {
    if (_isWithdrawing) return;
    setState(() => _isWithdrawing = true);
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (progressContext) => const PopScope(
        canPop: false,
        child: Dialog(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 24, vertical: 28),
            child: InvifyLoadingIndicator(message: 'SENDING WITHDRAWAL...'),
          ),
        ),
      ),
    );
    try {
      final result = await context.read<FinanceRepository>().initiatePayout(amount, otp: otp);
      if (mounted) Navigator.of(context, rootNavigator: true).pop();
      if (mounted) {
        context.read<FinanceBloc>().add(RefreshDashboardSummary());
        _showWithdrawalSuccess(amount: amount, quote: quote, payout: payout, result: result);
      }
    } catch (e) {
      if (mounted) Navigator.of(context, rootNavigator: true).pop();
      if (mounted) {
        _showError(friendlyApiError(e, fallback: 'Withdrawal failed. Please try again.'));
      }
    } finally {
      if (mounted) setState(() => _isWithdrawing = false);
    }
  }

  void _showWithdrawalSuccess({
    required double amount,
    required Map<String, dynamic> quote,
    required Map<String, dynamic> payout,
    required Map<String, dynamic> result,
  }) {
    final fee = double.tryParse('${result['service_fee'] ?? quote['service_fee'] ?? 0}') ?? 0;
    final bank = (payout['bank_name'] ?? payout['bankName'] ?? '').toString().trim();
    final accountName = (payout['account_name'] ?? payout['accountName'] ?? '').toString().trim();
    final accountNumber = (payout['account_number'] ?? payout['accountNumber'] ?? '').toString().trim();
    final reference = (result['reference'] ?? '').toString().trim();
    final status = (result['status'] ?? 'PENDING').toString().trim();
    final rawWhen = result['created_at'] ?? result['createdAt'];
    final whenAt = DateTime.tryParse('$rawWhen') ?? DateTime.now();
    final when = DateFormat('d MMM yyyy, h:mm a').format(whenAt);
    final displayAmount = double.tryParse('${result['requested_amount'] ?? result['amount'] ?? amount}') ?? amount;

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        final theme = Theme.of(dialogContext);
        final isDark = theme.brightness == Brightness.dark;
        final pending = WithdrawalConfirmationCopy.isPendingApproval(status);
        final failed = WithdrawalConfirmationCopy.isFailed(status);
        final statusColor = failed
            ? Colors.red.shade700
            : pending
                ? Colors.orange.shade800
                : Colors.green.shade800;
        final statusFill = failed
            ? Colors.red.shade50
            : pending
                ? Colors.orange.shade50
                : Colors.green.shade50;
        return Dialog(
          insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          backgroundColor: isDark ? theme.colorScheme.surface : Colors.white,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: 420,
              maxHeight: MediaQuery.of(dialogContext).size.height * 0.86,
            ),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Align(
                    alignment: Alignment.centerRight,
                    child: IconButton(
                      tooltip: 'Close',
                      onPressed: () => Navigator.pop(dialogContext),
                      icon: Icon(
                        Icons.close,
                        color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
                      ),
                    ),
                  ),
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: failed ? Colors.red.shade50 : Colors.green.shade50,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      failed ? Icons.error_outline_rounded : Icons.check_circle_rounded,
                      size: 44,
                      color: failed ? Colors.red.shade700 : Colors.green.shade600,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    WithdrawalConfirmationCopy.title(status),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      height: 1.25,
                      color: isDark ? Colors.white : const Color(0xFF1A1C1E),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    WithdrawalConfirmationCopy.message(status),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.4,
                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(height: 20),
                  _receiptRow(
                    Icons.payments_outlined,
                    'Amount',
                    CurrencyFormatter.formatWithSymbol(displayAmount),
                  ),
                  _receiptRow(
                    Icons.payments_outlined,
                    'Service fee',
                    CurrencyFormatter.formatWithSymbol(fee),
                  ),
                  _receiptRow(
                    Icons.account_balance_outlined,
                    'Bank',
                    bank.isEmpty ? 'Saved bank' : bank,
                  ),
                  _receiptRow(
                    Icons.person_outline,
                    'Account name',
                    accountName.isEmpty ? '—' : accountName,
                  ),
                  _receiptRow(
                    Icons.credit_card_outlined,
                    'Account number',
                    accountNumber.isEmpty ? '—' : accountNumber,
                  ),
                  _receiptRow(
                    Icons.calendar_today_outlined,
                    'Date and time',
                    when,
                  ),
                  _receiptRow(
                    Icons.receipt_long_outlined,
                    'Reference',
                    reference.isEmpty ? '—' : reference,
                  ),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.schedule,
                          size: 18,
                          color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Status',
                            style: TextStyle(
                              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        Flexible(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: isDark ? statusColor.withValues(alpha: 0.18) : statusFill,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.schedule, size: 14, color: statusColor),
                                const SizedBox(width: 6),
                                Flexible(
                                  child: Text(
                                    WithdrawalConfirmationCopy.statusLabel(status),
                                    style: TextStyle(
                                      color: statusColor,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(dialogContext),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        backgroundColor: const Color(0xFF0F766E),
                        foregroundColor: Colors.white,
                        textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text('OK'),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: () {
                      Navigator.pop(dialogContext);
                      Navigator.pushNamed(context, '/payout_history');
                    },
                    icon: const Icon(Icons.receipt_long_outlined, size: 18),
                    label: const Text('View transaction details'),
                    style: TextButton.styleFrom(
                      foregroundColor: isDark ? Colors.teal.shade200 : const Color(0xFF0F766E),
                      textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _receiptRow(IconData icon, String label, String value) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            size: 18,
            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
          ),
          const SizedBox(width: 10),
          Expanded(
            flex: 5,
            child: Text(
              label,
              style: TextStyle(
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                fontSize: 13,
              ),
            ),
          ),
          Expanded(
            flex: 6,
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 13,
                height: 1.3,
                color: isDark ? Colors.white : const Color(0xFF1A1C1E),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showError(String msg) {
    if (!mounted) return;
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Withdrawal failed'),
        content: SingleChildScrollView(child: Text(msg)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}
