// lib/features/school_finance/presentation/widgets/optimized_transaction_list.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../bloc/finance_new_bloc.dart';
import '../bloc/finance_new_event.dart';
import '../bloc/finance_new_state.dart';
import '../../data/models/finance_models.dart';

class OptimizedTransactionList extends StatefulWidget {
  final String walletId;

  const OptimizedTransactionList({super.key, required this.walletId});

  @override
  State<OptimizedTransactionList> createState() => _OptimizedTransactionListState();
}

class _OptimizedTransactionListState extends State<OptimizedTransactionList> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_isBottom) {
      context.read<FinanceBloc>().add(LoadMoreTransactions(widget.walletId));
    }
  }

  bool get _isBottom {
    if (!_scrollController.hasClients) return false;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    return currentScroll >= (maxScroll * 0.9); // Trigger early for smoothness
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<FinanceBloc, FinanceState>(
      builder: (context, state) {
        if (state.transactions.isEmpty && !state.isLoading) {
          return _buildEmptyState();
        }

        return RefreshIndicator(
          onRefresh: () async {
            context.read<FinanceBloc>().add(LoadStudentFinance(widget.walletId));
          },
          child: ListView.separated(
            controller: _scrollController,
            padding: const EdgeInsets.only(bottom: 100),
            itemCount: state.hasMoreData 
                ? state.transactions.length + 1 
                : state.transactions.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              if (index >= state.transactions.length) {
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.all(16.0),
                    child: Text('Loading more transactions...', style: TextStyle(fontSize: 12, color: Colors.grey, fontStyle: FontStyle.italic)),
                  ),
                );
              }

              final tx = state.transactions[index];
              return _TransactionTile(transaction: tx);
            },
          ),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            'No transactions yet',
            style: TextStyle(color: Colors.grey.shade400, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  final Transaction transaction;

  const _TransactionTile({required this.transaction});

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(symbol: '₦', decimalDigits: 0);
    final dateFormat = DateFormat('MMM dd, yyyy • HH:mm');
    
    final isCredit = transaction.type == FinanceTransactionType.credit;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          _buildLeadingIcon(isCredit),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  transaction.description.isNotEmpty 
                      ? transaction.description 
                      : (isCredit ? 'Credit Received' : 'Debit Charge'),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                const SizedBox(height: 4),
                Text(
                  dateFormat.format(transaction.createdAt),
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${isCredit ? "+" : "-"}${currencyFormat.format(transaction.amount)}',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: isCredit ? const Color(0xFF34A853) : const Color(0xFF1A1C1E),
                ),
              ),
              const SizedBox(height: 6),
              _buildStatusBadge(transaction.status),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLeadingIcon(bool isCredit) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: isCredit ? const Color(0xFF34A853).withOpacity(0.1) : Colors.grey.shade100,
        shape: BoxShape.circle,
      ),
      child: Icon(
        isCredit ? Icons.add_rounded : Icons.remove_rounded,
        color: isCredit ? const Color(0xFF34A853) : Colors.grey.shade700,
        size: 24,
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    String label = status.toUpperCase();
    
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
      case 'processed':
        color = const Color(0xFF34A853);
        break;
      case 'failed':
      case 'declined':
      case 'reversed':
        color = const Color(0xFFEA4335);
        break;
      case 'processing':
      case 'pending':
        color = const Color(0xFFFBBC05);
        break;
      default:
        color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: color),
      ),
    );
  }
}
