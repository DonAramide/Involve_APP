// lib/features/school_finance/presentation/pages/student_finance_profile_new.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../bloc/finance_new_bloc.dart';
import '../bloc/finance_new_event.dart';
import '../bloc/finance_new_state.dart';
import '../../data/models/finance_models.dart';
import '../../../../core/widgets/invify_loading_indicator.dart';

class StudentFinanceProfileScreen extends StatelessWidget {
  final String studentId;
  final String studentName;
  final String studentClass;

  const StudentFinanceProfileScreen({
    super.key,
    required this.studentId,
    required this.studentName,
    required this.studentClass,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: const BackButton(color: Colors.black),
        title: const Text(
          'Financial Profile',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: BlocBuilder<FinanceBloc, FinanceState>(
        builder: (context, state) {
          if (state.isLoading && state.summary == null) {
            return const InvifyLoadingIndicator(message: 'LOADING FINANCIAL PROFILE...');
          }

          if (state.error != null && state.summary == null) {
            return _ErrorView(studentId: studentId, message: state.error!);
          }

          return RefreshIndicator(
            onRefresh: () async {
              context.read<FinanceBloc>().add(LoadStudentFinance(studentId));
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 10),
                  
                  // 1. Header Section
                  _HeaderSection(name: studentName, className: studentClass),
                  const SizedBox(height: 24),

                  // 2. Financial Summary Section
                  if (state.summary != null)
                    _FinancialSummaryGrid(summary: state.summary!),
                  const SizedBox(height: 24),

                  // 3. Virtual Account card
                  _VirtualAccountCard(studentId: studentId),
                  const SizedBox(height: 32),

                  // 4. Payment History
                  const Text(
                    'Recent Transactions',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1A1C1E),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _TransactionList(transactions: state.transactions),
                  
                  const SizedBox(height: 100), // Bottom padding for FAB/Action
                ],
              ),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showRecordPaymentDialog(context),
        backgroundColor: const Color(0xFF0052FF),
        label: const Text('Record Payment', style: TextStyle(fontWeight: FontWeight.bold)),
        icon: const Icon(Icons.add),
      ),
    );
  }

  void _showRecordPaymentDialog(BuildContext context) {
    // This would trigger the RecordPaymentDialog implemented previously
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Opening Payment Recorder...')),
    );
  }
}

// ── Reusable Section: Header ────────────────────────────────────────────────

class _HeaderSection extends StatelessWidget {
  final String name;
  final String className;

  const _HeaderSection({required this.name, required this.className});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0052FF), Color(0xFF003AB3)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Center(
            child: Text(
              name[0].toUpperCase(),
              style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              name,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1A1C1E)),
            ),
            const SizedBox(height: 4),
            Text(
              className,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ],
    );
  }
}

// ── Reusable Section: Financial Summary Grid ──────────────────────────────

class _FinancialSummaryGrid extends StatelessWidget {
  final StudentFinanceSummary summary;

  const _FinancialSummaryGrid({required this.summary});

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(symbol: '₦', decimalDigits: 0);

    return Column(
      children: [
        _SummaryCard(
          label: 'Total Fees',
          amount: currencyFormat.format(summary.totalFees),
          color: const Color(0xFF1A1C1E),
          isPrimary: true,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _SummaryCard(
                label: 'Total Paid',
                amount: currencyFormat.format(summary.totalPaid),
                color: const Color(0xFF34A853),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _SummaryCard(
                label: 'Outstanding',
                amount: currencyFormat.format(summary.outstandingBalance),
                color: const Color(0xFFEA4335),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String label;
  final String amount;
  final Color color;
  final bool isPrimary;

  const _SummaryCard({
    required this.label,
    required this.amount,
    required this.color,
    this.isPrimary = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(isPrimary ? 20 : 16),
      decoration: BoxDecoration(
        color: isPrimary ? color : Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: isPrimary ? Colors.white.withOpacity(0.7) : Colors.grey.shade500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            amount,
            style: TextStyle(
              fontSize: isPrimary ? 24 : 18,
              fontWeight: FontWeight.bold,
              color: isPrimary ? Colors.white : color,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Reusable Section: Virtual Account ───────────────────────────────────────

class _VirtualAccountCard extends StatelessWidget {
  final String studentId;

  const _VirtualAccountCard({required this.studentId});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2C3E50), Color(0xFF000000)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'PERSONAL VIRTUAL ACCOUNT',
                style: TextStyle(color: Colors.white60, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.2),
              ),
              Icon(Icons.account_balance_rounded, color: Colors.white.withOpacity(0.2), size: 20),
            ],
          ),
          const SizedBox(height: 20),
          const Text(
            '9876543210', // This would come from dynamic state
            style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 2),
          ),
          const SizedBox(height: 8),
          const Text(
            'PROMISE MICROFINANCE BANK', // This would come from dynamic state
            style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () {
              Clipboard.setData(const ClipboardData(text: '9876543210'));
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Account number copied!')));
            },
            icon: const Icon(Icons.copy_rounded, size: 16),
            label: const Text('COPY NUMBER', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white.withOpacity(0.15),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Reusable Section: Transaction List ──────────────────────────────────────

class _TransactionList extends StatelessWidget {
  final List<Transaction> transactions;

  const _TransactionList({required this.transactions});

  @override
  Widget build(BuildContext context) {
    if (transactions.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 40),
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          children: [
            Icon(Icons.history_rounded, color: Colors.grey.shade300, size: 48),
            const SizedBox(height: 12),
            Text('No transactions yet', style: TextStyle(color: Colors.grey.shade400)),
          ],
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: transactions.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final tx = transactions[index];
        final currencyFormat = NumberFormat.currency(symbol: '₦', decimalDigits: 0);
        final dateFormat = DateFormat('MMM dd, yyyy');

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: tx.type == FinanceTransactionType.credit 
                      ? const Color(0xFF34A853).withOpacity(0.1) 
                      : const Color(0xFFEA4335).withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  tx.type == FinanceTransactionType.credit ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
                  color: tx.type == FinanceTransactionType.credit ? const Color(0xFF34A853) : const Color(0xFFEA4335),
                  size: 20,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tx.description.isNotEmpty ? tx.description : 'Payment Received',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${tx.channel.toUpperCase()} • ${dateFormat.format(tx.createdAt)}',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${tx.type == FinanceTransactionType.credit ? "+" : "-"}${currencyFormat.format(tx.amount)}',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: tx.type == FinanceTransactionType.credit ? const Color(0xFF34A853) : Colors.black,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF34A853).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'SUCCESS',
                      style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Color(0xFF34A853)),
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
}

// ── Helper View: Error ──────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  final String studentId;
  final String message;

  const _ErrorView({required this.studentId, required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline_rounded, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => context.read<FinanceBloc>().add(LoadStudentFinance(studentId)),
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }
}
