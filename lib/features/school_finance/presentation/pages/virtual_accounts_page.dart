// lib/features/school_finance/presentation/pages/virtual_accounts_page.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:involve_app/features/settings/presentation/bloc/staff_bloc.dart';
import '../../domain/repositories/finance_repository_new.dart';
import '../../../../core/services/service_locator.dart';
import '../bloc/finance_bloc.dart';

class VirtualAccountsPage extends StatefulWidget {
  const VirtualAccountsPage({super.key});

  @override
  State<VirtualAccountsPage> createState() => _VirtualAccountsPageState();
}

class _VirtualAccountsPageState extends State<VirtualAccountsPage> {
  final _repository = sl<FinanceRepository>();
  List<Map<String, dynamic>> _accounts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchAccounts();
  }

  Future<void> _fetchAccounts() async {
    setState(() => _isLoading = true);
    try {
      final data = await _repository.getVirtualAccounts();
      
      // Load local staff accounts with virtual accounts configured
      final staffState = context.read<StaffBloc>().state;
      final localStaffAccounts = staffState.staffList
          .where((s) => s.virtualAccountNumber != null && s.virtualAccountNumber!.trim().isNotEmpty)
          .map((s) {
            final accountNumber = s.virtualAccountNumber!.trim();
            final remoteMatch = data.cast<Map<String, dynamic>>().where(
              (acc) => acc['accountNumber'] == accountNumber,
            );
            final remoteBalance = remoteMatch.isNotEmpty
                ? (remoteMatch.first['balance'] as num?)?.toDouble() ?? 0.0
                : 0.0;
            return <String, dynamic>{
              'id': s.id,
              'name': s.name,
              'phone': s.phone ?? 'N/A',
              'email': 'N/A',
              'accountNumber': accountNumber,
              'bankName': s.virtualBankName ?? 'Quasar Sandbox Bank',
              'accountName': s.virtualAccountName ?? s.name,
              'holderType': 'Staff',
              'balance': remoteBalance,
            };
          })
          .toList();

      final merged = List<Map<String, dynamic>>.from(data);
      for (final localAcc in localStaffAccounts) {
        final exists = merged.any((acc) => acc['accountNumber'] == localAcc['accountNumber']);
        if (!exists) {
          merged.add(localAcc);
        }
      }

      setState(() {
        _accounts = merged;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(friendlyApiError(e, fallback: 'Could not load virtual accounts.')),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _showHistory(Map<String, dynamic> account) async {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        minChildSize: 0.4,
        builder: (context, scrollController) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.only(top: 10),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    const Icon(Icons.history, color: Colors.blue),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'History - ${account['accountName']}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: FutureBuilder<List<Map<String, dynamic>>>(
                  future: _repository.getVirtualAccountTransactions(account['accountNumber']),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (snapshot.hasError) {
                      return Center(child: Text('Error: ${snapshot.error}'));
                    }
                    final txns = snapshot.data ?? [];
                    if (txns.isEmpty) {
                      return const Center(
                        child: Text(
                          'No recent credits found for this account.',
                          style: TextStyle(color: Colors.grey),
                        ),
                      );
                    }
                    return ListView.separated(
                      controller: scrollController,
                      padding: const EdgeInsets.all(16),
                      itemCount: txns.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final tx = txns[index];
                        final amount = (tx['amount'] as num?)?.toDouble() ?? 0.0;
                        final dateStr = tx['createdAt'] as String;
                        final parsedDate = DateTime.tryParse(dateStr) ?? DateTime.now();
                        
                        return Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    tx['channel'] ?? 'Transfer',
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    tx['reference'] ?? '',
                                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontFamily: 'monospace'),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    DateFormat('yyyy-MM-dd HH:mm').format(parsedDate),
                                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                                  ),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    '+₦${NumberFormat('#,##0.00').format(amount)}',
                                    style: const TextStyle(
                                      color: Colors.green,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.green.shade50,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      tx['status'] ?? 'SUCCESS',
                                      style: TextStyle(
                                        color: Colors.green.shade700,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _sweepFunds(Map<String, dynamic> account) async {
    final amount = (account['balance'] as num?)?.toDouble() ?? 0.0;
    if (amount <= 0) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.currency_exchange, color: Colors.green),
            SizedBox(width: 8),
            Text('Sweep Funds'),
          ],
        ),
        content: Text(
          'Are you sure you want to sweep ₦${NumberFormat('#,##0.00').format(amount)} from ${account['accountName']}\'s virtual account to the business internal wallet?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('CANCEL'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green.shade700,
              foregroundColor: Colors.white,
            ),
            child: const Text('SWEEP'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    // Show loading indicator
    if (mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator()),
      );
    }

    try {
      final res = await _repository.sweepVirtualAccount(
        account['accountNumber'],
        amount,
      );

      // Close loading indicator
      if (mounted) Navigator.pop(context);

      if (res['success'] == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(res['message'] ?? 'Funds swept successfully!'),
              backgroundColor: Colors.green,
            ),
          );
        }
        
        // Refresh dashboard statistics so internal wallet balance updates
        if (mounted) {
          context.read<FinanceBloc>().add(RefreshDashboardSummary());
        }

        // Reload lists
        _fetchAccounts();
      } else {
        throw Exception(res['message'] ?? 'Sweep operation failed');
      }
    } catch (e) {
      // Close loading indicator if open
      if (mounted) Navigator.pop(context);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(friendlyApiError(e, fallback: 'Could not sweep funds. Please try again.')),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Virtual Accounts Sweep',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: Colors.black,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchAccounts,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _accounts.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: _fetchAccounts,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _accounts.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final acc = _accounts[index];
                      final balance = (acc['balance'] as num?)?.toDouble() ?? 0.0;
                      final isStaff = acc['holderType'] == 'Staff';
                      
                      return Card(
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: Colors.grey.shade200),
                        ),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: () => _showHistory(acc),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        acc['accountName'] ?? 'No Name',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: isStaff ? Colors.purple.shade50 : Colors.blue.shade50,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        acc['holderType'] ?? 'Customer',
                                        style: TextStyle(
                                          color: isStaff ? Colors.purple.shade700 : Colors.blue.shade700,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 11,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Icon(Icons.account_balance, size: 16, color: Colors.grey.shade500),
                                    const SizedBox(width: 8),
                                    Text(
                                      acc['bankName'] ?? 'Bank',
                                      style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    Icon(Icons.credit_card, size: 16, color: Colors.grey.shade500),
                                    const SizedBox(width: 8),
                                    Text(
                                      acc['accountNumber'] ?? '',
                                      style: const TextStyle(
                                        fontFamily: 'monospace',
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                const Divider(height: 1),
                                const SizedBox(height: 12),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Pending Funds',
                                          style: TextStyle(color: Colors.grey.shade500, fontSize: 11),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '₦${NumberFormat('#,##0.00').format(balance)}',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 16,
                                            color: balance > 0 ? Colors.green.shade700 : Colors.black,
                                          ),
                                        ),
                                      ],
                                    ),
                                    Row(
                                      children: [
                                        IconButton(
                                          icon: const Icon(Icons.history, color: Colors.blue),
                                          onPressed: () => _showHistory(acc),
                                          tooltip: 'Transactions',
                                        ),
                                        const SizedBox(width: 4),
                                        ElevatedButton.icon(
                                          onPressed: balance > 0 ? () => _sweepFunds(acc) : null,
                                          icon: const Icon(Icons.currency_exchange, size: 14),
                                          label: const Text('Sweep'),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.green.shade700,
                                            foregroundColor: Colors.white,
                                            elevation: 0,
                                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(10),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.account_balance_wallet_outlined, size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          const Text(
            'No Active Virtual Accounts',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.blueGrey),
          ),
          const SizedBox(height: 8),
          const Text(
            'Virtual accounts will appear here once generated for staff or members.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }
}
