// lib/features/school_finance/presentation/pages/payout_history_page.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import '../../domain/repositories/finance_repository_new.dart';
import '../../../../core/services/service_locator.dart';
import 'package:intl/intl.dart';

class PayoutHistoryPage extends StatefulWidget {
  const PayoutHistoryPage({super.key});

  @override
  State<PayoutHistoryPage> createState() => _PayoutHistoryPageState();
}

class _PayoutHistoryPageState extends State<PayoutHistoryPage> {
  final _repository = sl<FinanceRepository>();
  final List<dynamic> _payouts = [];
  bool _isLoading = true;
  int _currentPage = 1;
  bool _hasMore = true;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _fetchHistory();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200 &&
        !_isLoading &&
        _hasMore) {
      _fetchHistory();
    }
  }

  Future<void> _fetchHistory({bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _currentPage = 1;
        _payouts.clear();
        _hasMore = true;
      });
    }

    setState(() => _isLoading = true);
    try {
      final result = await _repository.getPayoutHistory(page: _currentPage);
      final List<dynamic> newData = result['data'];
      
      setState(() {
        _payouts.addAll(newData);
        _isLoading = false;
        _hasMore = newData.length == 20;
        _currentPage++;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyApiError(e, fallback: 'Could not load payout history.'))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F9),
      appBar: AppBar(
        title: const Text('Payout History', style: TextStyle(fontWeight: FontWeight.w800)),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
      ),
      body: RefreshIndicator(
        onRefresh: () => _fetchHistory(refresh: true),
        child: _payouts.isEmpty && !_isLoading
            ? _buildEmptyState()
            : ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                itemCount: _payouts.length + (_isLoading ? 1 : 0),
                itemBuilder: (context, index) {
                  if (index == _payouts.length) {
                    return const Center(child: Padding(padding: EdgeInsets.all(16.0), child: Text('Loading older records...', style: TextStyle(fontSize: 12, color: Colors.grey, fontStyle: FontStyle.italic))));
                  }
                  return _buildPayoutCard(_payouts[index]);
                },
              ),
      ),
    );
  }

  Widget _buildPayoutCard(Map<String, dynamic> item) {
    final currencyFormat = NumberFormat.currency(symbol: '₦', decimalDigits: 2);
    final date = DateTime.parse(item['created_at']);
    final status = item['status'] as String;
    
    Color statusColor = Colors.orange;
    if (status == 'SUCCESS') statusColor = Colors.green;
    else if (status == 'FAILED') statusColor = Colors.red;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Fund Sweep',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Colors.blue.shade900),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    DateFormat('MMM dd, yyyy • hh:mm a').format(date),
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
              Text(
                currencyFormat.format(item['amount']),
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFF1A1C1E)),
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
                  Icon(Icons.account_balance, size: 14, color: Colors.grey.shade400),
                  const SizedBox(width: 8),
                  Text(
                    item['metadata']?['bank_details'] ?? 'Saved Bank Account',
                    style: const TextStyle(fontSize: 13, color: Colors.black87, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
              _buildStatusBadge(status, statusColor),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.history_rounded, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          const Text('No payout history found', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
