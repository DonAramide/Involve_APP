import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/finance_bloc.dart';
import '../widgets/finance_summary_card.dart';
import '../widgets/virtual_account_card.dart';
import '../widgets/student_transaction_item.dart';
import '../widgets/record_payment_dialog.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:involve_app/core/utils/terminology.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class StudentFinanceProfilePage extends StatefulWidget {
  final String studentId;
  final String studentName;
  final String? studentClass;
  final String? admissionNumber;
  final String walletId;

  const StudentFinanceProfilePage({
    super.key,
    required this.studentId,
    required this.studentName,
    required this.walletId,
    this.studentClass,
    this.admissionNumber,
  });

  @override
  State<StudentFinanceProfilePage> createState() => _StudentFinanceProfilePageState();
}

class _StudentFinanceProfilePageState extends State<StudentFinanceProfilePage> {
  @override
  void initState() {
    super.initState();
    // Load high-fidelity student financial profile
    context.read<FinanceBloc>().add(LoadStudentProfile(widget.studentId));
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.read<SettingsBloc>().state.settings;
    final memberLabel = settings?.customerLabel ?? 'Customer';

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Text('$memberLabel Ledger', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => context.read<FinanceBloc>().add(LoadStudentProfile(widget.studentId)),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: BlocBuilder<FinanceBloc, FinanceState>(
        builder: (context, state) {
          if (state is FinanceLoading) {
            return const InvifyLoadingIndicator(message: 'LOADING LEDGER DETAILS...');
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
                      friendlyApiError(state.message, fallback: 'Could not load student finance.'),
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 14, color: Colors.grey.shade600, height: 1.4),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: () => context.read<FinanceBloc>().add(LoadStudentProfile(widget.studentId)),
                      icon: const Icon(Icons.refresh_rounded, size: 18),
                      label: const Text('Try Again'),
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

          if (state is FinanceProfileLoaded) {
            return RefreshIndicator(
              onRefresh: () async {
                context.read<FinanceBloc>().add(LoadStudentProfile(widget.studentId));
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. Student Info Header
                    _buildHeader(settings),
                    const SizedBox(height: 24),

                    // 2. Financial Summary row
                    _buildSummaryCards(state, settings),
                    const SizedBox(height: 24),

                    // 3. Virtual Account (if exists)
                    if (state.virtualAccount != null) ...[
                      const Text(
                        'Instant Payment Details',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),
                      VirtualAccountCard(
                        account: state.virtualAccount!,
                        studentName: widget.studentName,
                      ),
                      const SizedBox(height: 24),
                    ],

                    // 4. History Feed
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Transaction Feed',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        TextButton(
                          onPressed: () {},
                          child: const Text('See All'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    
                    if (state.transactions.isEmpty)
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 60),
                          child: Column(
                            children: [
                              Icon(Icons.history_toggle_off, size: 48, color: Colors.grey.shade300),
                              const SizedBox(height: 8),
                              Text('No transactions found', style: TextStyle(color: Colors.grey.shade400)),
                            ],
                          ),
                        ),
                      )
                    else
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: state.transactions.length,
                        itemBuilder: (context, index) {
                          return StudentTransactionItem(
                            transaction: state.transactions[index],
                          );
                        },
                      ),
                    
                    const SizedBox(height: 80), // Space for bottom navbar
                  ],
                ),
              ),
            );
          }

          return const SizedBox.shrink();
        },
      ),
      bottomSheet: _buildActionPanel(context),
    );
  }

  Widget _buildHeader(AppSettings? settings) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: Colors.indigo.shade50,
            child: Text(
              widget.studentName[0].toUpperCase(),
              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.indigo.shade700, fontSize: 20),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.studentName,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                if (settings?.businessMode == 'school')
                  Text(
                    '${widget.studentClass ?? "Unknown Class"} • ${widget.admissionNumber ?? "No ID"}',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                  )
                else
                  Text(
                    'Account ID: ${widget.studentId}',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                  ),
              ],
            ),
          ),
          _buildStatusBadge(),
        ],
      ),
    );
  }

  Widget _buildStatusBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Text(
        'ACTIVE',
        style: TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildSummaryCards(FinanceProfileLoaded state, AppSettings? settings) {
    final outstanding = state.summary.outstandingBalance;
    final totalLabel = settings?.businessMode == 'school' ? 'Total Fees' : 'Total Billed';
    
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: FinanceSummaryCard(
                title: totalLabel,
                amount: state.summary.totalFees,
                color: Colors.blue.shade800,
                icon: Icons.receipt_long_rounded,
                subtitle: 'Accrued Billed',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FinanceSummaryCard(
                title: 'Total Paid',
                amount: state.summary.totalPaid,
                color: Colors.green.shade800,
                icon: Icons.check_circle_rounded,
                subtitle: 'Settled to date',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        FinanceSummaryCard(
          title: 'Outstanding Balance',
          amount: outstanding,
          color: outstanding > 0 ? Colors.red.shade800 : Colors.green.shade800,
          icon: Icons.account_balance_wallet_rounded,
          subtitle: outstanding > 0 
              ? 'Pending payment needed' 
              : 'Zero / Overpaid balance',
        ),
      ],
    );
  }

  Widget _buildActionPanel(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey.shade100)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, -4)),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () {
                // Placeholder for Apply Discount trigger
              },
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Apply Discount', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton(
              onPressed: () async {
                final result = await RecordPaymentDialog.show(
                  context, 
                  studentId: widget.studentId, 
                  studentName: widget.studentName,
                );
                if (result != null && mounted) {
                  context.read<FinanceBloc>().add(RecordManualPaymentRequested(
                    studentId: widget.studentId,
                    amount: result['amount'],
                    method: result['method'],
                    note: result['note'],
                  ));
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.indigo.shade800,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Record Payment', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
