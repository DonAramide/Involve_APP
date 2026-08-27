// lib/features/school_finance/presentation/pages/virtual_accounts_page.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/school/domain/repositories/school_repository.dart';
import 'package:involve_app/features/school/presentation/bloc/school_bloc.dart';
import 'package:involve_app/features/services/domain/repositories/services_repository.dart';
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
  bool _isSyncing = false;
  String? _statusBanner;

  @override
  void initState() {
    super.initState();
    _fetchAccounts();
  }

  /// Local staff / students / customers that already have a VA on device.
  Future<List<Map<String, dynamic>>> _buildLocalAccounts() async {
    final byNumber = <String, Map<String, dynamic>>{};

    void upsert(Map<String, dynamic> row) {
      final accountNumber = (row['accountNumber'] ?? '').toString().trim();
      if (accountNumber.isEmpty) return;
      byNumber.putIfAbsent(accountNumber, () => row);
    }

    // Staff (always in memory via StaffBloc)
    try {
      final staffState = context.read<StaffBloc>().state;
      for (final s in staffState.staffList) {
        final accountNumber = s.virtualAccountNumber?.trim() ?? '';
        if (accountNumber.isEmpty) continue;
        upsert({
          'id': s.id,
          'name': s.name,
          'phone': s.phone ?? 'N/A',
          'email': 'N/A',
          'accountNumber': accountNumber,
          'bankName': s.virtualBankName ?? 'Quasar Sandbox Bank',
          'accountName': s.virtualAccountName ?? s.name,
          'holderType': 'Staff',
          'balance': 0.0,
          'source': 'local',
        });
      }
    } catch (_) {}

    // Students (SchoolBloc cache, else local DB)
    try {
      var students = <Student>[];
      try {
        students = List<Student>.from(context.read<SchoolBloc>().state.students);
      } catch (_) {}
      if (students.isEmpty) {
        try {
          students = await context.read<SchoolRepository>().getStudentSummaries();
        } catch (_) {}
      }
      for (final s in students) {
        final accountNumber = s.virtualAccountNumber?.trim() ?? '';
        if (accountNumber.isEmpty) continue;
        final name = s.fullName.trim();
        upsert({
          'id': s.id,
          'name': name,
          'phone': s.parentPhone ?? 'N/A',
          'email': 'N/A',
          'accountNumber': accountNumber,
          'bankName': s.virtualAccountBank ?? 'Quasar Sandbox Bank',
          'accountName': name,
          'holderType': 'Student',
          'balance': 0.0,
          'source': 'local',
        });
      }
    } catch (_) {}

    // Customers / members
    try {
      final customers = await context.read<IServicesRepository>().getCustomers();
      for (final c in customers) {
        final accountNumber = c.virtualAccountNumber?.trim() ?? '';
        if (accountNumber.isEmpty) continue;
        upsert({
          'id': c.id,
          'name': c.name,
          'phone': c.phone ?? 'N/A',
          'email': c.email ?? 'N/A',
          'accountNumber': accountNumber,
          'bankName': c.virtualAccountBank ?? 'Quasar Sandbox Bank',
          'accountName': c.virtualAccountName ?? c.name,
          'holderType': 'Customer',
          'balance': 0.0,
          'source': 'local',
        });
      }
    } catch (_) {}

    final list = byNumber.values.toList()
      ..sort((a, b) => (a['accountName'] as String)
          .toLowerCase()
          .compareTo((b['accountName'] as String).toLowerCase()));
    return list;
  }

  List<Map<String, dynamic>> _mergeRemote(
    List<Map<String, dynamic>> local,
    List<Map<String, dynamic>> remote,
  ) {
    final merged = <String, Map<String, dynamic>>{};

    for (final acc in remote) {
      final accountNumber = (acc['accountNumber'] ?? '').toString().trim();
      if (accountNumber.isEmpty) continue;
      merged[accountNumber] = Map<String, dynamic>.from(acc)..['source'] = 'remote';
    }

    for (final localAcc in local) {
      final accountNumber = (localAcc['accountNumber'] ?? '').toString().trim();
      if (accountNumber.isEmpty) continue;
      final existing = merged[accountNumber];
      if (existing == null) {
        merged[accountNumber] = Map<String, dynamic>.from(localAcc);
      } else {
        // Prefer remote balance; keep local holder type / labels when richer.
        merged[accountNumber] = {
          ...localAcc,
          ...existing,
          'holderType': existing['holderType'] ?? localAcc['holderType'],
          'accountName': (existing['accountName']?.toString().trim().isNotEmpty == true)
              ? existing['accountName']
              : localAcc['accountName'],
          'bankName': (existing['bankName']?.toString().trim().isNotEmpty == true)
              ? existing['bankName']
              : localAcc['bankName'],
          'balance': (existing['balance'] as num?)?.toDouble() ??
              (localAcc['balance'] as num?)?.toDouble() ??
              0.0,
          'source': 'remote',
        };
      }
    }

    final list = merged.values.toList()
      ..sort((a, b) => (a['accountName']?.toString() ?? '')
          .toLowerCase()
          .compareTo((b['accountName']?.toString() ?? '').toLowerCase()));
    return list;
  }

  Future<void> _fetchAccounts() async {
    final hadData = _accounts.isNotEmpty;
    if (!hadData) {
      setState(() {
        _isLoading = true;
        _statusBanner = null;
      });
    } else {
      setState(() {
        _isSyncing = true;
        _statusBanner = null;
      });
    }

    // 1) Offline-first: paint local VAs immediately (no network wait).
    final local = await _buildLocalAccounts();
    if (!mounted) return;
    setState(() {
      _accounts = local;
      _isLoading = false;
      _isSyncing = true;
    });

    // 2) Enrich with live balances — fail fast when server is unreachable.
    try {
      final remote = await _repository.getVirtualAccounts(
        timeout: const Duration(seconds: 6),
      );
      if (!mounted) return;
      setState(() {
        _accounts = _mergeRemote(local, remote);
        _isSyncing = false;
        _statusBanner = null;
      });
    } catch (e) {
      if (!mounted) return;
      final msg = friendlyApiError(
        e,
        fallback: 'Could not reach the server for live balances.',
      );
      setState(() {
        _isSyncing = false;
        _statusBanner = local.isEmpty
            ? msg
            : 'Showing saved virtual accounts. Live balances unavailable — $msg';
      });
      // Only hard snack when there is nothing local to show.
      if (local.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: Colors.red),
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
                  future: _repository
                      .getVirtualAccountTransactions(account['accountNumber'])
                      .timeout(const Duration(seconds: 8)),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (snapshot.hasError) {
                      return Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(
                            friendlyApiError(
                              snapshot.error,
                              fallback:
                                  'Could not load history offline. Try again when the server is reachable.',
                            ),
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.grey.shade700),
                          ),
                        ),
                      );
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
                        final dateStr = tx['createdAt'] as String? ?? '';
                        final parsedDate =
                            DateTime.tryParse(dateStr) ?? DateTime.now();

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
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    tx['reference'] ?? '',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade600,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    DateFormat('yyyy-MM-dd HH:mm')
                                        .format(parsedDate),
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.grey.shade500,
                                    ),
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
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 2),
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

        if (mounted) {
          context.read<FinanceBloc>().add(RefreshDashboardSummary());
        }

        _fetchAccounts();
      } else {
        throw Exception(res['message'] ?? 'Sweep operation failed');
      }
    } catch (e) {
      if (mounted) Navigator.pop(context);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(friendlyApiError(
              e,
              fallback: 'Could not sweep funds. Please try again.',
            )),
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
          if (_isSyncing)
            const Padding(
              padding: EdgeInsets.only(right: 8),
              child: Center(
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isSyncing ? null : _fetchAccounts,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (_statusBanner != null)
                  Material(
                    color: Colors.amber.shade50,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.cloud_off_outlined,
                              size: 18, color: Colors.amber.shade900),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _statusBanner!,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.amber.shade900,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                Expanded(
                  child: _accounts.isEmpty
                      ? _buildEmptyState()
                      : RefreshIndicator(
                          onRefresh: _fetchAccounts,
                          child: ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: _accounts.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final acc = _accounts[index];
                              final balance =
                                  (acc['balance'] as num?)?.toDouble() ?? 0.0;
                              final holder =
                                  (acc['holderType'] ?? 'Customer').toString();
                              final isStaff = holder == 'Staff';
                              final isStudent = holder == 'Student';

                              return Card(
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  side:
                                      BorderSide(color: Colors.grey.shade200),
                                ),
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(16),
                                  onTap: () => _showHistory(acc),
                                  child: Padding(
                                    padding: const EdgeInsets.all(16.0),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Expanded(
                                              child: Text(
                                                acc['accountName'] ??
                                                    'No Name',
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 16,
                                                ),
                                              ),
                                            ),
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 8,
                                                      vertical: 4),
                                              decoration: BoxDecoration(
                                                color: isStaff
                                                    ? Colors.purple.shade50
                                                    : isStudent
                                                        ? Colors.teal.shade50
                                                        : Colors.blue.shade50,
                                                borderRadius:
                                                    BorderRadius.circular(8),
                                              ),
                                              child: Text(
                                                holder,
                                                style: TextStyle(
                                                  color: isStaff
                                                      ? Colors.purple.shade700
                                                      : isStudent
                                                          ? Colors
                                                              .teal.shade700
                                                          : Colors
                                                              .blue.shade700,
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 11,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 12),
                                        Text(
                                          acc['bankName'] ?? '',
                                          style: TextStyle(
                                            color: Colors.grey.shade600,
                                            fontSize: 13,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          acc['accountNumber'] ?? '',
                                          style: const TextStyle(
                                            fontFamily: 'monospace',
                                            fontWeight: FontWeight.w600,
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                        const SizedBox(height: 16),
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  'Pending Balance',
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    color:
                                                        Colors.grey.shade500,
                                                  ),
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  '₦${NumberFormat('#,##0.00').format(balance)}',
                                                  style: TextStyle(
                                                    fontSize: 18,
                                                    fontWeight: FontWeight.bold,
                                                    color: balance > 0
                                                        ? Colors
                                                            .green.shade700
                                                        : Colors.grey.shade700,
                                                  ),
                                                ),
                                              ],
                                            ),
                                            Row(
                                              children: [
                                                IconButton(
                                                  icon: const Icon(
                                                      Icons.history,
                                                      color: Colors.blue),
                                                  onPressed: () =>
                                                      _showHistory(acc),
                                                  tooltip: 'Transactions',
                                                ),
                                                const SizedBox(width: 4),
                                                ElevatedButton.icon(
                                                  onPressed: balance > 0
                                                      ? () =>
                                                          _sweepFunds(acc)
                                                      : null,
                                                  icon: const Icon(
                                                      Icons
                                                          .currency_exchange,
                                                      size: 14),
                                                  label: const Text('Sweep'),
                                                  style: ElevatedButton
                                                      .styleFrom(
                                                    backgroundColor: Colors
                                                        .green.shade700,
                                                    foregroundColor:
                                                        Colors.white,
                                                    elevation: 0,
                                                    padding: const EdgeInsets
                                                        .symmetric(
                                                        horizontal: 16,
                                                        vertical: 8),
                                                    shape:
                                                        RoundedRectangleBorder(
                                                      borderRadius:
                                                          BorderRadius
                                                              .circular(10),
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
                ),
              ],
            ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.account_balance_wallet_outlined,
              size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          const Text(
            'No Active Virtual Accounts',
            style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Colors.blueGrey),
          ),
          const SizedBox(height: 8),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              'Virtual accounts will appear here once generated for staff or members.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          ),
        ],
      ),
    );
  }
}
