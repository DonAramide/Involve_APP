// lib/features/school_finance/presentation/pages/virtual_accounts_page.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/school/domain/repositories/school_repository.dart';
import 'package:involve_app/features/school/presentation/bloc/school_bloc.dart';
import 'package:involve_app/features/invoicing/domain/repositories/invoice_repository.dart';
import 'package:involve_app/core/utils/invoice_payment_rail.dart';
import '../../domain/repositories/finance_repository_new.dart';
import 'package:involve_app/features/services/domain/repositories/services_repository.dart';
import 'package:involve_app/features/settings/presentation/bloc/staff_bloc.dart';
import '../../domain/repositories/finance_repository_new.dart';
import '../../../../core/services/service_locator.dart';

class VirtualAccountsPage extends StatefulWidget {
  const VirtualAccountsPage({super.key});

  @override
  State<VirtualAccountsPage> createState() => _VirtualAccountsPageState();
}

class _VirtualAccountsPageState extends State<VirtualAccountsPage> {
  final _repository = sl<FinanceRepository>();
  final _searchController = TextEditingController();
  List<Map<String, dynamic>> _accounts = [];
  bool _isLoading = true;
  bool _isSyncing = false;
  String? _statusBanner;
  String _query = '';
  String _filter = 'all';
  int _parentCount = 0;
  Set<String> _parentAccountNumbers = {};

  @override
  void initState() {
    super.initState();
    _fetchAccounts();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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

  Future<List<Map<String, dynamic>>> _subtractWalletFees(
    List<Map<String, dynamic>> accounts,
  ) async {
    if (accounts.isEmpty) return accounts;
    try {
      var invoices = <Invoice>[];
      try {
        invoices = await context.read<InvoiceRepository>().getAllInvoices();
      } catch (_) {
        invoices = List<Invoice>.from(context.read<SchoolBloc>().state.studentInvoices);
      }
      if (invoices.isEmpty) return accounts;

      final schoolRepo = context.read<SchoolRepository>();
      final students = await schoolRepo.getStudents();
      final parents = await schoolRepo.getParents();
      final vaByStudentId = <int, String>{};
      final vasByParentId = <int, Set<String>>{};
      for (final s in students) {
        final va = (s.virtualAccountNumber ?? '').trim();
        if (s.id != null && va.isNotEmpty) vaByStudentId[s.id!] = va;
        final parentId = s.parentId;
        if (parentId == null) continue;
        vasByParentId.putIfAbsent(parentId, () => <String>{});
        if (va.isNotEmpty) vasByParentId[parentId]!.add(va);
      }
      for (final p in parents) {
        final va = (p.virtualAccountNumber ?? '').trim();
        if (p.id == null || va.isEmpty) continue;
        vasByParentId.putIfAbsent(p.id!, () => <String>{});
        vasByParentId[p.id!]!.add(va);
      }

      final appliedByVa = <String, double>{};
      for (final inv in invoices) {
        if (inv.invoiceNumber.startsWith('PMT-')) continue;
        if (classifyInvoicePaymentRail(inv.paymentMethod) != InvoicePaymentRail.wallet) {
          continue;
        }
        final collected = inv.amountPaid;
        if (collected <= 0) continue;
        final targets = <String>{};
        final studentVa = vaByStudentId[inv.studentId];
        if (studentVa != null) targets.add(studentVa);
        for (final s in students) {
          if (s.id == inv.studentId && s.parentId != null) {
            targets.addAll(vasByParentId[s.parentId!] ?? const <String>{});
            break;
          }
        }
        for (final va in targets) {
          appliedByVa[va] = (appliedByVa[va] ?? 0) + collected;
        }
      }

      return accounts.map((acc) {
        final va = (acc['accountNumber'] ?? '').toString().trim();
        final applied = appliedByVa[va] ?? 0;
        if (applied <= 0) return acc;
        final current = (acc['balance'] as num?)?.toDouble() ?? 0;
        return {
          ...acc,
          'balance': current > applied ? current - applied : 0.0,
          'appliedToFees': applied,
        };
      }).toList();
    } catch (_) {
      return accounts;
    }
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
    final local = await _subtractWalletFees(await _buildLocalAccounts());
    if (!mounted) return;
    setState(() {
      _accounts = local;
      _isLoading = false;
      _isSyncing = true;
    });
    await _loadParentStats();

    // 2) Enrich with live balances — fail fast when server is unreachable.
    try {
      final remote = await _repository.getVirtualAccounts(
        timeout: const Duration(seconds: 6),
      );
      if (!mounted) return;
      final merged = await _subtractWalletFees(_mergeRemote(local, remote));
      if (!mounted) return;
      setState(() {
        _accounts = merged;
        _isSyncing = false;
        _statusBanner = null;
      });
      await _loadParentStats();
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
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        minChildSize: 0.4,
        builder: (context, scrollController) => Container(
          decoration: BoxDecoration(
            color: isDark ? theme.colorScheme.surface : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.only(top: 10),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? Colors.grey.shade700 : Colors.grey.shade300,
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
                            color: isDark ? theme.colorScheme.surfaceContainerHighest : Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isDark ? theme.dividerColor : Colors.grey.shade200),
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
                                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    DateFormat('yyyy-MM-dd HH:mm')
                                        .format(parsedDate),
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade500,
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

  double get _totalFunds {
    var total = 0.0;
    for (final acc in _accounts) {
      total += _balanceOf(acc);
    }
    return total;
  }

  double _balanceOf(Map<String, dynamic> acc) =>
      (acc['balance'] as num?)?.toDouble() ?? 0.0;

  bool _isParentAccount(Map<String, dynamic> acc) {
    final holder = (acc['holderType'] ?? '').toString();
    final number = (acc['accountNumber'] ?? '').toString().trim();
    return holder == 'Parent' ||
        holder == 'Customer' ||
        _parentAccountNumbers.contains(number);
  }

  int get _parentsWithFunds {
    final seen = <String>{};
    var count = 0;
    for (final acc in _accounts) {
      if (!_isParentAccount(acc) || _balanceOf(acc) <= 0.009) continue;
      final number = (acc['accountNumber'] ?? '').toString().trim();
      if (number.isEmpty || !seen.add(number)) continue;
      count++;
    }
    return count;
  }

  int get _shownParentCount {
    if (_parentCount > 0) return _parentCount;
    final seen = <String>{};
    for (final acc in _accounts) {
      if (!_isParentAccount(acc)) continue;
      final number = (acc['accountNumber'] ?? '').toString().trim();
      if (number.isNotEmpty) seen.add(number);
    }
    return seen.length;
  }

  List<Map<String, dynamic>> get _visibleAccounts {
    final query = _query.trim().toLowerCase();
    return _accounts.where((acc) {
      final balance = _balanceOf(acc);
      final holder = (acc['holderType'] ?? 'Customer').toString();
      if (_filter == 'funded' && balance <= 0.009) return false;
      if (_filter == 'parent' && !_isParentAccount(acc)) return false;
      if (_filter == 'staff' && holder != 'Staff') return false;
      if (_filter == 'student' && holder != 'Student') return false;
      if (query.isEmpty) return true;
      final haystack = [
        acc['accountName'],
        acc['name'],
        acc['accountNumber'],
        acc['bankName'],
        acc['phone'],
      ].map((value) => (value ?? '').toString().toLowerCase()).join(' ');
      return haystack.contains(query);
    }).toList();
  }

  Future<void> _loadParentStats() async {
    List<SchoolParent> parents = const [];
    try {
      parents = await context.read<SchoolRepository>().getParents();
    } catch (_) {
      try {
        parents = context.read<SchoolBloc>().state.parents;
      } catch (_) {}
    }
    final numbers = <String>{};
    for (final parent in parents) {
      final canonical = (parent.virtualAccountNumber ?? '').trim();
      if (canonical.isNotEmpty) numbers.add(canonical);
      for (final account in parent.virtualAccounts) {
        final number = account.accountNumber.trim();
        if (number.isNotEmpty) numbers.add(number);
      }
    }
    if (!mounted) return;
    setState(() {
      _parentCount = parents.length;
      _parentAccountNumbers = numbers;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? theme.scaffoldBackgroundColor : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          'Virtual Accounts',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 18,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
        backgroundColor: isDark ? theme.colorScheme.surface : Colors.white,
        elevation: 0,
        foregroundColor: isDark ? Colors.white : Colors.black,
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
                    color: isDark ? Colors.amber.withOpacity(0.15) : Colors.amber.shade50,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.cloud_off_outlined,
                              size: 18, color: isDark ? Colors.amber.shade300 : Colors.amber.shade900),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _statusBanner!,
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? Colors.amber.shade200 : Colors.amber.shade900,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                if (_accounts.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 18,
                      ),
                      decoration: BoxDecoration(
                        color: isDark
                            ? theme.colorScheme.surface
                            : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isDark
                              ? theme.dividerColor
                              : Colors.grey.shade200,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Total funds',
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark
                                  ? Colors.grey.shade400
                                  : Colors.grey.shade600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '₦${NumberFormat('#,##0.00').format(_totalFunds)}',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              color: _totalFunds > 0
                                  ? (isDark
                                      ? Colors.greenAccent
                                      : Colors.green.shade700)
                                  : (isDark
                                      ? Colors.grey.shade300
                                      : Colors.grey.shade800),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Row(
                            children: [
                              Expanded(
                                child: _countTile(
                                  'Parents with funds',
                                  '$_parentsWithFunds',
                                  isDark,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _countTile(
                                  'Total parents',
                                  '$_shownParentCount',
                                  isDark,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (value) => setState(() => _query = value),
                    decoration: InputDecoration(
                      hintText: 'Search name or account number',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _query.isEmpty
                          ? null
                          : IconButton(
                              icon: const Icon(Icons.close),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _query = '');
                              },
                            ),
                      filled: true,
                      fillColor: isDark
                          ? theme.colorScheme.surface
                          : Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(
                          color: isDark
                              ? theme.dividerColor
                              : Colors.grey.shade200,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(
                          color: isDark
                              ? theme.dividerColor
                              : Colors.grey.shade200,
                        ),
                      ),
                      contentPadding: const EdgeInsets.symmetric(vertical: 0),
                    ),
                  ),
                ),
                SizedBox(
                  height: 48,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    children: [
                      _filterChip('All', 'all', isDark),
                      _filterChip('With funds', 'funded', isDark),
                      _filterChip('Parents', 'parent', isDark),
                      _filterChip('Staff', 'staff', isDark),
                      _filterChip('Students', 'student', isDark),
                    ],
                  ),
                ),
                Expanded(
                  child: _accounts.isEmpty
                      ? _buildEmptyState()
                      : _visibleAccounts.isEmpty
                          ? const Center(
                              child: Text('No accounts match this search.'),
                            )
                          : RefreshIndicator(
                          onRefresh: _fetchAccounts,
                          child: ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: _visibleAccounts.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final acc = _visibleAccounts[index];
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
                                      BorderSide(color: isDark ? theme.dividerColor : Colors.grey.shade200),
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
                                                    ? (isDark ? Colors.purple.withOpacity(0.25) : Colors.purple.shade50)
                                                    : isStudent
                                                        ? (isDark ? Colors.teal.withOpacity(0.25) : Colors.teal.shade50)
                                                        : (isDark ? Colors.blue.withOpacity(0.25) : Colors.blue.shade50),
                                                borderRadius:
                                                    BorderRadius.circular(8),
                                              ),
                                              child: Text(
                                                holder,
                                                style: TextStyle(
                                                  color: isStaff
                                                      ? (isDark ? Colors.purple.shade200 : Colors.purple.shade700)
                                                      : isStudent
                                                          ? (isDark ? Colors.teal.shade200 : Colors.teal.shade700)
                                                          : (isDark ? Colors.blue.shade200 : Colors.blue.shade700),
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
                                            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
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
                                                  'Unspent after fees',
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    color:
                                                        isDark ? Colors.grey.shade400 : Colors.grey.shade500,
                                                  ),
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  '₦${NumberFormat('#,##0.00').format(balance)}',
                                                  style: TextStyle(
                                                    fontSize: 18,
                                                    fontWeight: FontWeight.bold,
                                                    color: balance > 0
                                                        ? (isDark ? Colors.greenAccent : Colors.green.shade700)
                                                        : (isDark ? Colors.grey.shade400 : Colors.grey.shade700),
                                                  ),
                                                ),
                                              ],
                                            ),
                                            IconButton(
                                              icon: const Icon(
                                                  Icons.history,
                                                  color: Colors.blue),
                                              onPressed: () =>
                                                  _showHistory(acc),
                                              tooltip: 'Transactions',
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

  Widget _countTile(String label, String value, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  Widget _filterChip(String label, String value, bool isDark) {
    final selected = _filter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => setState(() => _filter = value),
        selectedColor: isDark ? Colors.indigo.shade700 : Colors.indigo.shade50,
        labelStyle: TextStyle(
          color: selected
              ? (isDark ? Colors.white : Colors.indigo.shade800)
              : (isDark ? Colors.grey.shade300 : Colors.grey.shade800),
          fontWeight: selected ? FontWeight.bold : FontWeight.w500,
        ),
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
