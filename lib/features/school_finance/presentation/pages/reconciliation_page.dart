// lib/features/school_finance/presentation/pages/reconciliation_page.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import '../bloc/reconciliation_bloc.dart';
import '../bloc/reconciliation_event.dart';
import '../bloc/reconciliation_state.dart';
import '../../domain/repositories/finance_repository_new.dart';
import '../../../../core/services/service_locator.dart';
import 'package:intl/intl.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import '../../../settings/presentation/bloc/settings_state.dart';
import '../../../../core/utils/terminology.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class ReconciliationPage extends StatefulWidget {
  const ReconciliationPage({super.key});

  @override
  State<ReconciliationPage> createState() => _ReconciliationPageState();
}

class _ReconciliationPageState extends State<ReconciliationPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final List<String> _statusFilters = ['all', 'matched', 'unmatched', 'issues'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        context.read<ReconciliationBloc>().add(ApplyFilter(_statusFilters[_tabController.index]));
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F9),
      appBar: AppBar(
        title: const Text('Reconciliation Hub', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF1A1C1E))),
        elevation: 0,
        backgroundColor: Colors.white,
        centerTitle: false,
        actions: [
          IconButton(
            onPressed: () => context.read<ReconciliationBloc>().add(RefreshReconciliation()),
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF1A1C1E)),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: BlocBuilder<SettingsBloc, SettingsState>(
        builder: (context, settingsState) {
          final settings = settingsState.settings;
          return BlocBuilder<ReconciliationBloc, ReconciliationState>(
            builder: (context, state) {
              return Column(
                children: [
                  _buildSummaryBar(state),
                  _buildTabHeader(),
                  Expanded(
                    child: _buildBody(state, settings),
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildSummaryBar(ReconciliationState state) {
    if (state is! ReconciliationLoaded) return const SizedBox.shrink();
    final summary = state.summary;
    final activeStatus = state.currentStatus ?? 'all';
    
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildSummaryCard(
              'Total', 
              summary['totalPayments'].toString(), 
              const Color(0xFF1A1C1E),
              activeStatus == 'all',
              () {
                _tabController.animateTo(0);
                context.read<ReconciliationBloc>().add(const ApplyFilter('all'));
              }
            ),
            _buildSummaryCard(
              'Matched', 
              summary['matched'].toString(), 
              const Color(0xFF34A853),
              activeStatus == 'matched',
              () {
                _tabController.animateTo(1);
                context.read<ReconciliationBloc>().add(const ApplyFilter('matched'));
              }
            ),
            _buildSummaryCard(
              'Unmatched', 
              summary['unmatched'].toString(), 
              const Color(0xFFFF9900),
              activeStatus == 'unmatched',
              () {
                _tabController.animateTo(2);
                context.read<ReconciliationBloc>().add(const ApplyFilter('unmatched'));
              }
            ),
            _buildSummaryCard(
              'Issues', 
              summary['issues'].toString(), 
              const Color(0xFFEA4335),
              activeStatus == 'issues',
              () {
                _tabController.animateTo(3);
                context.read<ReconciliationBloc>().add(const ApplyFilter('issues'));
              }
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryCard(String label, String value, Color color, bool isActive, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 130,
        margin: const EdgeInsets.only(right: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isActive ? color : color.withOpacity(0.05),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isActive ? color : color.withOpacity(0.1), width: 1.5),
          boxShadow: isActive ? [
            BoxShadow(color: color.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 6)),
          ] : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label, 
              style: TextStyle(
                color: isActive ? Colors.white.withOpacity(0.8) : color.withOpacity(0.6), 
                fontSize: 12, 
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5
              )
            ),
            const SizedBox(height: 8),
            Text(
              value, 
              style: TextStyle(
                color: isActive ? Colors.white : color, 
                fontSize: 28, 
                fontWeight: FontWeight.w900
              )
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabHeader() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: TabBar(
        controller: _tabController,
        indicator: BoxDecoration(
          color: const Color(0xFF1A1C1E),
          borderRadius: BorderRadius.circular(10),
        ),
        labelColor: Colors.white,
        unselectedLabelColor: Colors.grey,
        indicatorSize: TabBarIndicatorSize.tab,
        labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
        tabs: const [
          Tab(text: 'All'),
          Tab(text: 'Matched'),
          Tab(text: 'Unmatched'),
          Tab(text: 'Issues'),
        ],
      ),
    );
  }

  Widget _buildBody(ReconciliationState state, dynamic settings) {
    if (state is ReconciliationLoading) {
      return const InvifyLoadingIndicator(message: 'RECONCILING PAYMENT LEDGERS...');
    } else if (state is ReconciliationError) {
      return _buildErrorState(state.message);
    } else if (state is ReconciliationLoaded) {
      return _buildPaymentList(state.payments, settings);
    }
    return const SizedBox.shrink();
  }

  Widget _buildPaymentList(List<dynamic> data, dynamic settings) {
    if (data.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.assignment_turned_in_outlined, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            const Text('Everything looks clean!', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w600)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: data.length,
      itemBuilder: (context, index) {
        final item = data[index];
        return _buildPaymentCard(item, settings);
      },
    );
  }

  Widget _buildErrorState(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 16),
          Text(message, style: const TextStyle(color: Colors.red)),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => context.read<ReconciliationBloc>().add(RefreshReconciliation()),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentCard(Map<String, dynamic> item, dynamic settings) {
    final currencyFormat = NumberFormat.currency(symbol: '₦', decimalDigits: 2);
    final date = DateTime.parse(item['createdAt']);
    final isIssue = item['issueType'] == 'duplicate_payment' || item['issueType'] == 'provider_mismatch';
    final isUnmatched = item['issueType'] != null && !isIssue;
    
    final assignLabel = settings != null ? (settings.assignToCustomerLabel) : 'Assign Entity';

    // Color Logic
    Color statusColor = const Color(0xFF34A853); // Default Green (Matched)
    if (isIssue) statusColor = const Color(0xFFEA4335); // Red
    else if (isUnmatched) statusColor = const Color(0xFFFF9900); // Orange

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border(left: BorderSide(color: statusColor, width: 4)), // Clear highlight
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item['studentName'] ?? item['customerName'] ?? 'Unassigned Payment',
                      style: TextStyle(
                        fontWeight: FontWeight.w800, 
                        fontSize: 15,
                        color: isUnmatched ? const Color(0xFFFF9900) : const Color(0xFF1A1C1E)
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item['reference'],
                      style: const TextStyle(fontSize: 11, color: Colors.grey, fontFamily: 'monospace'),
                    ),
                  ],
                ),
                Text(
                  currencyFormat.format(item['amount']),
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: Color(0xFF1A1C1E)),
                ),
              ],
            ),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Divider(height: 1, color: Color(0xFFF1F3F5)),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.calendar_today_outlined, size: 12, color: Colors.grey.shade400),
                    const SizedBox(width: 4),
                    Text(
                      DateFormat('MMM dd, hh:mm a').format(date),
                      style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
                _buildStatusBadge(item['issueType'], item['status']),
              ],
            ),
            if (item['issueType'] != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  if (isUnmatched)
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _showResolutionDialog(item, settings),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFF9900), // Match Orange
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: Text(assignLabel, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  if (isIssue)
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _handleRetry(item['reference']),
                        icon: const Icon(Icons.refresh_rounded, size: 16),
                        label: const Text('Retry Processing', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFEA4335), // Match Red
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String? issueType, String status) {
    Color color = const Color(0xFF34A853);
    String text = 'MATCHED';
    
    if (issueType != null) {
      if (issueType == 'duplicate_payment' || issueType == 'provider_mismatch') {
        color = const Color(0xFFEA4335);
        text = issueType.replaceAll('_', ' ').toUpperCase();
      } else {
        color = const Color(0xFFFF9900);
        text = issueType.replaceAll('_', ' ').toUpperCase();
      }
    } else if (status != 'SUCCESS') {
      color = Colors.grey;
      text = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Text(
        text,
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5),
      ),
    );
  }

  Future<void> _handleRetry(String reference) async {
    try {
      await context.read<FinanceRepository>().retryReconciliation(reference);
      if (mounted) {
        context.read<ReconciliationBloc>().add(RefreshReconciliation());
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Retry initiated.')));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyApiError(e, fallback: 'Retry failed.'))));
    }
  }

  void _showResolutionDialog(Map<String, dynamic> item, dynamic settings) {
    final TextEditingController _entityIdController = TextEditingController();
    final manualAssignmentLabel = settings?.assignToCustomerLabel ?? 'Manual Assignment';
    final idHint = settings?.customerLabel ?? 'Entity ID';

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
              const Text('Resolve Discrepancy', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20)),
              const SizedBox(height: 8),
              Text('Reference: ${item['reference']}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
              const SizedBox(height: 24),
              Text(manualAssignmentLabel, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 8),
              TextField(
                controller: _entityIdController,
                decoration: InputDecoration(
                  hintText: 'Enter $idHint ID',
                  filled: true,
                  fillColor: const Color(0xFFF1F3F5),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  prefixIcon: const Icon(Icons.person_search_outlined),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                         try {
                            await context.read<FinanceRepository>().assignToStudent(
                              reference: item['reference'], 
                              studentId: _entityIdController.text, 
                            );
                            if (mounted) {
                              Navigator.pop(context);
                              context.read<ReconciliationBloc>().add(RefreshReconciliation());
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment assigned.')));
                            }
                         } catch (e) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyApiError(e, fallback: 'Action failed.'))));
                         }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1A1C1E),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Patch Record'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
