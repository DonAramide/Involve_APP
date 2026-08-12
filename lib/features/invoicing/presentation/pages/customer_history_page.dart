import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/features/invoicing/presentation/history/bloc/history_bloc.dart';
import 'package:involve_app/features/invoicing/presentation/history/bloc/history_state.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:collection/collection.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

import 'package:involve_app/features/services/domain/entities/service_customer.dart';
import 'package:involve_app/features/school_finance/domain/repositories/finance_repository_new.dart';
import 'package:involve_app/features/services/domain/repositories/services_repository.dart';
import 'package:involve_app/features/services/domain/services/customer_wallet_credit_service.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';
import 'package:involve_app/features/invoicing/domain/repositories/invoice_repository.dart';
import 'package:involve_app/features/invoicing/presentation/pages/receipt_preview_page.dart';
import 'package:involve_app/core/widgets/va_credentials_required_dialog.dart';

class CustomerHistoryPage extends StatefulWidget {
  final ServiceCustomer customer;
  final DateTimeRange? initialDateRange;

  const CustomerHistoryPage({
    super.key,
    required this.customer,
    this.initialDateRange,
  });

  @override
  State<CustomerHistoryPage> createState() => _CustomerHistoryPageState();
}

class _CustomerHistoryPageState extends State<CustomerHistoryPage>
    with SingleTickerProviderStateMixin {
  DateTimeRange? _selectedRange;
  late ServiceCustomer _currentCustomer;
  bool _isVirtualAccountExpanded = true;
  late TabController _tabController;
  List<Map<String, dynamic>> _fundTransactions = [];
  bool _loadingFunds = false;
  String? _fundsError;
  /// Canonical VA credit total from server (matches Sweep pending when nothing swept).
  double _remoteFundsReceived = 0;
  StreamSubscription? _walletCreditSub;

  @override
  void initState() {
    super.initState();
    _currentCustomer = widget.customer;
    _selectedRange = widget.initialDateRange;
    _tabController = TabController(length: 2, vsync: this);
    _bootstrap();
    _walletCreditSub =
        CustomerWalletCreditService.instance.onWalletCredited.listen((c) {
      if (!mounted) return;
      if (c.id != _currentCustomer.id) return;
      setState(() => _currentCustomer = c);
      _loadFundTransactions();
    });
  }

  Future<void> _bootstrap() async {
    await _reconcileHiddenWalletCredit();
    if (!mounted) return;
    context.read<HistoryBloc>().add(LoadHistory(
          customerName: _currentCustomer.name,
          start: _selectedRange?.start,
          end: _selectedRange?.end,
        ));
    _refreshCustomer();
    _loadFundTransactions();
  }

  /// Fix invoices that still show Unpaid/₦0 after wallet credit was netted into balance.
  Future<void> _reconcileHiddenWalletCredit() async {
    try {
      await context
          .read<InvoiceRepository>()
          .reconcileWalletCreditOnCustomerInvoices(_currentCustomer.id);
    } catch (e) {
      debugPrint('[CustomerHistory] wallet reconcile skipped: $e');
    }
  }

  @override
  void dispose() {
    _walletCreditSub?.cancel();
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _refreshCustomer() async {
    try {
      final fresh = await context
          .read<IServicesRepository>()
          .getCustomerById(_currentCustomer.id);
      if (fresh != null && mounted) {
        setState(() => _currentCustomer = fresh);
      }
    } catch (_) {}
  }

  void _loadHistory() {
    _reconcileHiddenWalletCredit().then((_) {
      if (!mounted) return;
      context.read<HistoryBloc>().add(LoadHistory(
            customerName: _currentCustomer.name,
            start: _selectedRange?.start,
            end: _selectedRange?.end,
          ));
    });
  }

  Future<void> _loadFundTransactions() async {
    setState(() {
      _loadingFunds = true;
      _fundsError = null;
    });
    try {
      final repo = context.read<IServicesRepository>();
      var local = await repo.getCustomerFundTransactions(_currentCustomer.id);
      final localRefs = local
          .map((e) => e['reference']?.toString())
          .whereType<String>()
          .where((r) => r.isNotEmpty)
          .toSet();

      List<Map<String, dynamic>> remote = [];
      final va = _currentCustomer.virtualAccountNumber?.trim();
      if (va != null && va.isNotEmpty) {
        try {
          final financeRepo = context.read<FinanceRepository>();
          remote = await financeRepo.getVirtualAccountTransactions(va);
        } catch (e) {
          debugPrint('[CustomerHistory] VA tx fetch failed: $e');
        }
      }

      // Auto-apply any remote SUCCESS credits not yet posted to local wallet.
      // Oldest first so balanceAfter chain matches chronological deposits.
      final pendingRemote = remote.where((tx) {
        final ref = (tx['reference'] ?? tx['id'] ?? '').toString();
        if (ref.isEmpty || localRefs.contains(ref)) return false;
        final status = (tx['status'] ?? 'SUCCESS').toString().toUpperCase();
        return status == 'SUCCESS';
      }).toList()
        ..sort((a, b) {
          final da =
              DateTime.tryParse('${a['createdAt'] ?? a['created_at']}') ??
                  DateTime(1970);
          final db =
              DateTime.tryParse('${b['createdAt'] ?? b['created_at']}') ??
                  DateTime(1970);
          return da.compareTo(db);
        });

      for (final tx in pendingRemote) {
        final ref = (tx['reference'] ?? tx['id'] ?? '').toString();
        final amount = tx['amount'] is num
            ? (tx['amount'] as num).toDouble()
            : double.tryParse('${tx['amount']}') ?? 0;
        if (amount <= 0) continue;
        final meta = tx['metadata'] is Map
            ? Map<String, dynamic>.from(tx['metadata'] as Map)
            : <String, dynamic>{};
        final updated = await repo.creditCustomerWalletFromDeposit(
          amount: amount,
          reference: ref,
          customerId: _currentCustomer.id,
          virtualAccountNumber: va,
          senderName: (tx['senderName'] ??
                  meta['senderName'] ??
                  meta['studentName'] ??
                  _currentCustomer.name)
              .toString(),
          senderBank:
              (tx['senderBank'] ?? meta['senderBank'] ?? meta['bankName'] ?? '')
                  .toString(),
          createdAt: (tx['createdAt'] ?? tx['created_at'])?.toString(),
        );
        if (updated != null) {
          _currentCustomer = updated;
        }
      }

      if (pendingRemote.isNotEmpty) {
        local = await repo.getCustomerFundTransactions(_currentCustomer.id);
        final fresh = await repo.getCustomerById(_currentCustomer.id);
        if (fresh != null) _currentCustomer = fresh;
      }

      final merged = <String, Map<String, dynamic>>{};
      // Authoritative received total = unique SUCCESS remote credits for this VA.
      final remoteCreditByRef = <String, double>{};
      for (final tx in remote) {
        final ref = (tx['reference'] ?? tx['id'] ?? '').toString();
        if (ref.isEmpty) continue;
        final type = (tx['type'] ?? 'CREDIT').toString().toUpperCase();
        if (type == 'SWEEP' || type == 'DEBIT' || type == 'WITHDRAWAL') continue;
        final amount = tx['amount'] is num
            ? (tx['amount'] as num).toDouble()
            : double.tryParse('${tx['amount']}') ?? 0;
        if (amount <= 0) continue;
        remoteCreditByRef[ref] = amount;
      }
      final remoteFundsTotal =
          remoteCreditByRef.values.fold<double>(0, (a, b) => a + b);

      for (final tx in remote) {
        final ref = (tx['reference'] ?? tx['id'] ?? '').toString();
        if (ref.isEmpty) continue;
        final amount = remoteCreditByRef[ref] ??
            (tx['amount'] is num
                ? (tx['amount'] as num).toDouble()
                : double.tryParse('${tx['amount']}') ?? 0);
        final meta = tx['metadata'] is Map
            ? Map<String, dynamic>.from(tx['metadata'] as Map)
            : <String, dynamic>{};
        merged[ref] = {
          'id': tx['id'] ?? ref,
          'reference': ref,
          'amount': amount,
          'type': (tx['type'] ?? 'CREDIT').toString(),
          'status': (tx['status'] ?? 'SUCCESS').toString(),
          'createdAt': tx['createdAt'] ??
              tx['created_at'] ??
              DateTime.now().toIso8601String(),
          'senderName': tx['senderName'] ??
              meta['senderName'] ??
              meta['studentName'] ??
              'Unknown Sender',
          'senderBank':
              tx['senderBank'] ?? meta['senderBank'] ?? meta['bankName'] ?? '',
          'virtualAccountNumber': tx['virtualAccountNumber'] ??
              meta['virtualAccountNumber'] ??
              meta['accountNumber'] ??
              va,
          'source': 'remote',
          'amountSource': 'remote',
        };
      }

      // Enrich with local auto-debit details; never override remote amount.
      for (final tx in local) {
        final ref = (tx['reference'] ?? tx['id'] ?? '').toString();
        if (ref.isEmpty) continue;
        final source = (tx['source'] ?? '').toString();
        if (source == 'catchup_notify_only') continue;

        final localAmount = tx['amount'] is num
            ? (tx['amount'] as num).toDouble()
            : double.tryParse('${tx['amount']}') ?? 0;

        if (merged.containsKey(ref)) {
          merged[ref] = {
            ...merged[ref]!,
            ...tx,
            'reference': ref,
            // Keep server amount so totals match Virtual Accounts Sweep.
            'amount': merged[ref]!['amount'],
            'amountSource': 'remote',
            if (tx['balanceBefore'] != null) 'balanceBefore': tx['balanceBefore'],
            if (tx['balanceAfter'] != null) 'balanceAfter': tx['balanceAfter'],
            if (tx['appliedToDebt'] != null) 'appliedToDebt': tx['appliedToDebt'],
            if (tx['remainingAsCredit'] != null)
              'remainingAsCredit': tx['remainingAsCredit'],
            if (tx['autoDebit'] != null) 'autoDebit': tx['autoDebit'],
          };
        } else if (remote.isEmpty) {
          // Offline-only: show local credits when server history unavailable.
          merged[ref] = {
            ...tx,
            'reference': ref,
            'amount': localAmount,
            'amountSource': 'local',
          };
        }
        // If remote loaded successfully, ignore local-only orphans (prevents ₦21 drift).
      }

      final list = merged.values.toList()
        ..sort((a, b) {
          final da = DateTime.tryParse('${a['createdAt']}') ?? DateTime(1970);
          final db = DateTime.tryParse('${b['createdAt']}') ?? DateTime(1970);
          return db.compareTo(da);
        });

      if (!mounted) return;
      setState(() {
        _fundTransactions = list;
        _remoteFundsReceived = remote.isNotEmpty
            ? remoteFundsTotal
            : list.fold<double>(
                0,
                (sum, tx) =>
                    sum +
                    ((tx['amount'] as num?)?.toDouble() ??
                        double.tryParse('${tx['amount']}') ??
                        0),
              );
        _loadingFunds = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingFunds = false;
        _fundsError = e.toString();
      });
    }
  }

  Future<void> _selectDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
      initialDateRange: _selectedRange,
    );
    if (picked != null) {
      setState(() => _selectedRange = picked);
      _loadHistory();
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.read<SettingsBloc>().state.settings;
    final currency = settings?.currency ?? '₦';

    return Scaffold(
      appBar: AppBar(
        title: Text(_currentCustomer.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              _refreshCustomer();
              _loadHistory();
              _loadFundTransactions();
            },
          ),
          IconButton(
            icon: const Icon(Icons.date_range),
            onPressed: _selectDateRange,
          ),
          if (_selectedRange != null)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                setState(() => _selectedRange = null);
                _loadHistory();
              },
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Purchases'),
            Tab(text: 'Funds'),
          ],
        ),
      ),
      body: Column(
        children: [
          _buildVirtualAccountCard(_currentCustomer, currency),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildPurchasesTab(currency),
                _buildFundsTab(currency),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPurchasesTab(String currency) {
    return BlocBuilder<HistoryBloc, HistoryState>(
      builder: (context, state) {
        if (state is HistoryLoading) {
          return const InvifyLoadingIndicator(
              message: 'RETRIEVING TRANSACTION LEDGERS...');
        } else if (state is HistoryError) {
          return Center(child: Text(state.message));
        } else if (state is HistoryLoaded) {
          final invoices = state.invoices;

          final List<_PurchasedItem> allItems = [];
          for (final inv in invoices) {
            for (final item in inv.items) {
              allItems.add(_PurchasedItem(
                date: inv.dateCreated,
                name: item.item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                invoiceNumber: inv.invoiceNumber,
                invoice: inv,
              ));
            }
          }

          final groupedItems =
              groupBy(allItems, (item) => DateFormat('yyyy-MM-dd').format(item.date));
          final sortedDates = groupedItems.keys.toList()
            ..sort((a, b) => b.compareTo(a));

          return Column(
            children: [
              _buildSummaryCard(state.totalInvoiced, currency),
              Expanded(
                child: invoices.isEmpty
                    ? const Center(
                        child: Text('No purchases found for this period.'))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: sortedDates.length,
                        itemBuilder: (context, index) {
                          final dateStr = sortedDates[index];
                          final items = groupedItems[dateStr]!;
                          final displayDate = DateFormat('EEEE, MMM dd, yyyy')
                              .format(items.first.date);

                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                    vertical: 8.0, horizontal: 4.0),
                                child: Text(
                                  displayDate.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: Theme.of(context).primaryColor,
                                    letterSpacing: 1.1,
                                  ),
                                ),
                              ),
                              ...items.map((item) => _buildItemTile(item, currency)),
                              const SizedBox(height: 16),
                            ],
                          );
                        },
                      ),
              ),
            ],
          );
        }
        return const SizedBox();
      },
    );
  }

  double get _totalFundsReceived {
    // Prefer server VA credit total so this matches Virtual Accounts Sweep pending
    // (when no sweeps have been made yet).
    if (_remoteFundsReceived > 0) return _remoteFundsReceived;
    double sum = 0;
    for (final tx in _fundTransactions) {
      if ((tx['source'] ?? '').toString() == 'catchup_notify_only') continue;
      final amount = (tx['amount'] as num?)?.toDouble() ??
          double.tryParse('${tx['amount']}') ??
          0;
      sum += amount;
    }
    return sum;
  }

  double get _totalAutoDebited {
    double sum = 0;
    for (final tx in _fundTransactions) {
      final applied = (tx['appliedToDebt'] as num?)?.toDouble() ??
          double.tryParse('${tx['appliedToDebt']}') ??
          0;
      sum += applied;
    }
    return sum;
  }

  Widget _buildFundsTab(String currency) {
    if (_loadingFunds) {
      return const InvifyLoadingIndicator(message: 'LOADING FUND TRANSFERS...');
    }
    if (_fundsError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(_fundsError!, textAlign: TextAlign.center),
        ),
      );
    }
    if (_fundTransactions.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'No fund transfers yet.\nDeposits to this customer’s virtual account will appear here.',
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadFundTransactions,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _fundTransactions.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            return _buildFundsSummaryCard(currency);
          }
          final tx = _fundTransactions[index - 1];
          return _buildFundTile(tx, currency);
        },
      ),
    );
  }

  Widget _buildFundsSummaryCard(String currency) {
    final total = _totalFundsReceived;
    final debited = _totalAutoDebited;
    final balance = _currentCustomer.balance;
    final balanceLabel = balance > 0
        ? 'Still owing'
        : balance < 0
            ? 'Wallet credit'
            : 'Settled';
    final balanceColor =
        balance > 0 ? Colors.red : (balance < 0 ? Colors.green : Colors.grey);

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.teal.shade700, Colors.teal.shade900],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'TOTAL FUNDS RECEIVED',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            CurrencyFormatter.formatWithSymbol(total, symbol: currency),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _summaryStat(
                  'Auto-debited',
                  CurrencyFormatter.formatWithSymbol(debited, symbol: currency),
                ),
              ),
              Expanded(
                child: _summaryStat(
                  balanceLabel,
                  CurrencyFormatter.formatWithSymbol(
                    balance.abs(),
                    symbol: currency,
                  ),
                  valueColor: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Incoming funds auto-debit customer owing, then add leftover as wallet credit.',
            style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 11),
          ),
        ],
      ),
    );
  }

  Widget _summaryStat(String label, String value, {Color? valueColor}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(color: Colors.white.withOpacity(0.65), fontSize: 11)),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            color: valueColor ?? Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  Widget _buildFundTile(Map<String, dynamic> tx, String currency) {
    final amount = (tx['amount'] as num?)?.toDouble() ?? 0;
    final createdAt =
        DateTime.tryParse('${tx['createdAt']}') ?? DateTime.now();
    final sender = '${tx['senderName'] ?? 'Unknown'}';
    final bank = '${tx['senderBank'] ?? ''}';
    final ref = '${tx['reference'] ?? ''}';
    final va = '${tx['virtualAccountNumber'] ?? ''}';
    final status = '${tx['status'] ?? 'SUCCESS'}';
    final appliedToDebt = (tx['appliedToDebt'] as num?)?.toDouble() ?? 0;
    final remainingCredit =
        (tx['remainingAsCredit'] as num?)?.toDouble() ?? 0;
    final balanceAfter = (tx['balanceAfter'] as num?)?.toDouble();
    final autoDebit = tx['autoDebit'] == true || appliedToDebt > 0;

    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showFundDetails(tx, currency),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: Colors.green.shade100,
                    child: Icon(Icons.south_west, color: Colors.green.shade800),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          autoDebit
                              ? 'Fund received · auto-debit'
                              : 'Wallet credit · $sender',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          DateFormat('dd MMM yyyy · HH:mm').format(createdAt),
                          style: TextStyle(
                              color: Colors.grey.shade600, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '+${CurrencyFormatter.formatWithSymbol(amount, symbol: currency)}',
                    style: TextStyle(
                      color: Colors.green.shade700,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
              if (autoDebit || remainingCredit > 0 || balanceAfter != null) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.orange.shade100),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (appliedToDebt > 0)
                        Text(
                          'Auto-debit against owing: ${CurrencyFormatter.formatWithSymbol(appliedToDebt, symbol: currency)}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.orange.shade900,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      if (remainingCredit > 0)
                        Text(
                          'Added to wallet credit: ${CurrencyFormatter.formatWithSymbol(remainingCredit, symbol: currency)}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.green.shade800,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      if (balanceAfter != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          balanceAfter > 0
                              ? 'New balance (owing): ${CurrencyFormatter.formatWithSymbol(balanceAfter, symbol: currency)}'
                              : balanceAfter < 0
                                  ? 'New balance (credit): ${CurrencyFormatter.formatWithSymbol(balanceAfter.abs(), symbol: currency)}'
                                  : 'New balance: Settled (₦0.00)',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  _chip('Ref: $ref'),
                  if (bank.isNotEmpty) _chip(bank),
                  _chip(status, color: Colors.green),
                  if (autoDebit) _chip('AUTO-DEBIT', color: Colors.deepOrange),
                ],
              ),
              if (va.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text('VA: $va',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade700)),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _chip(String label, {Color color = Colors.blueGrey}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  void _showFundDetails(Map<String, dynamic> tx, String currency) {
    final amount = (tx['amount'] as num?)?.toDouble() ?? 0;
    final createdAt =
        DateTime.tryParse('${tx['createdAt']}') ?? DateTime.now();
    final balanceBefore = (tx['balanceBefore'] as num?)?.toDouble();
    final balanceAfter = (tx['balanceAfter'] as num?)?.toDouble();
    final appliedToDebt = (tx['appliedToDebt'] as num?)?.toDouble() ?? 0;
    final remainingCredit =
        (tx['remainingAsCredit'] as num?)?.toDouble() ?? 0;

    String fmtBalance(double? v) {
      if (v == null) return '—';
      if (v > 0) {
        return 'Owing ${CurrencyFormatter.formatWithSymbol(v, symbol: currency)}';
      }
      if (v < 0) {
        return 'Credit ${CurrencyFormatter.formatWithSymbol(v.abs(), symbol: currency)}';
      }
      return 'Settled (₦0.00)';
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Fund transfer details'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _detailRow('Amount received',
                  '+${CurrencyFormatter.formatWithSymbol(amount, symbol: currency)}'),
              _detailRow('Type', '${tx['type'] ?? 'CREDIT'}'),
              _detailRow('Status', '${tx['status'] ?? 'SUCCESS'}'),
              _detailRow('Reference', '${tx['reference'] ?? '—'}'),
              _detailRow('Sender', '${tx['senderName'] ?? '—'}'),
              _detailRow('Sender bank', '${tx['senderBank'] ?? '—'}'),
              _detailRow(
                  'Virtual account', '${tx['virtualAccountNumber'] ?? '—'}'),
              _detailRow(
                  'Date', DateFormat('dd MMM yyyy HH:mm:ss').format(createdAt)),
              const Divider(height: 20),
              _detailRow('Balance before', fmtBalance(balanceBefore)),
              if (appliedToDebt > 0)
                _detailRow(
                  'Auto-debit (owing)',
                  CurrencyFormatter.formatWithSymbol(appliedToDebt,
                      symbol: currency),
                ),
              if (remainingCredit > 0)
                _detailRow(
                  'Added as credit',
                  CurrencyFormatter.formatWithSymbol(remainingCredit,
                      symbol: currency),
                ),
              _detailRow('Balance after', fmtBalance(balanceAfter)),
            ],
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('CLOSE')),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
          ),
          Expanded(
            child: Text(value,
                style:
                    const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(double totalSpent, String currency) {
    final totalReceived = _totalFundsReceived;
    final walletBalance = _currentCustomer.balance;
    final walletAbs = walletBalance.abs();
    final walletTitle = walletBalance > 0
        ? 'CURRENT OWING'
        : walletBalance < 0
            ? 'WALLET CREDIT'
            : 'WALLET BALANCE';
    final walletHint = walletBalance > 0
        ? 'Customer still owes this amount'
        : walletBalance < 0
            ? 'Available credit after auto-debit'
            : 'Fully settled';

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Theme.of(context).primaryColor,
            Color.lerp(Theme.of(context).primaryColor, Colors.black, 0.2)!
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).primaryColor.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: _summaryMetric(
                  'TOTAL AMOUNT SPENT',
                  CurrencyFormatter.formatWithSymbol(totalSpent, symbol: currency),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _summaryMetric(
                  'TOTAL AMOUNT RECEIVED',
                  CurrencyFormatter.formatWithSymbol(totalReceived, symbol: currency),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(color: Colors.white24, height: 1),
          const SizedBox(height: 14),
          Text(
            walletTitle,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            CurrencyFormatter.formatWithSymbol(walletAbs, symbol: currency),
            style: TextStyle(
              color: walletBalance > 0
                  ? Colors.redAccent.shade100
                  : walletBalance < 0
                      ? Colors.lightGreenAccent.shade100
                      : Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            walletHint,
            style: TextStyle(color: Colors.white.withOpacity(0.65), fontSize: 11),
          ),
          if (_selectedRange != null)
            Padding(
              padding: const EdgeInsets.only(top: 8.0),
              child: Text(
                'Spent total is for selected period',
                style: TextStyle(color: Colors.white.withOpacity(0.55), fontSize: 11),
              ),
            ),
        ],
      ),
    );
  }

  Widget _summaryMetric(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 10,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildItemTile(_PurchasedItem item, String currency) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        onTap: () => _showPurchaseRecord(item.invoice, currency),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        title: Text(item.name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('Inv: ${item.invoiceNumber} • ${DateFormat('HH:mm').format(item.date)}'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${item.quantity} x ${CurrencyFormatter.formatWithSymbol(item.unitPrice, symbol: currency)}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 4),
                Text(
                  CurrencyFormatter.formatWithSymbol(item.quantity * item.unitPrice, symbol: currency),
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black87),
                ),
              ],
            ),
            const SizedBox(width: 4),
            Icon(Icons.chevron_right, color: Colors.grey.shade500),
          ],
        ),
      ),
    );
  }

  void _showPurchaseRecord(Invoice invoice, String currency) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return DraggableScrollableSheet(
          initialChildSize: 0.78,
          minChildSize: 0.45,
          maxChildSize: 0.95,
          builder: (_, scrollController) {
            return Container(
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Column(
                children: [
                  const SizedBox(height: 10),
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade400,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 8, 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Purchase record',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                invoice.invoiceNumber,
                                style: TextStyle(
                                  color: Colors.grey.shade600,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () {
                            Navigator.pop(ctx);
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) =>
                                    ReceiptPreviewPage(invoice: invoice),
                              ),
                            );
                          },
                          icon: const Icon(Icons.receipt_long, size: 18),
                          label: const Text('Receipt'),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(ctx),
                          icon: const Icon(Icons.close),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: ListView(
                      controller: scrollController,
                      padding: const EdgeInsets.all(16),
                      children: [
                        _recordInfoCard(currency, invoice),
                        const SizedBox(height: 12),
                        const Text(
                          'Items purchased',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ...invoice.items.map(
                          (line) => Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              title: Text(
                                line.item.name,
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                              subtitle: Text(
                                '${line.quantity} × ${CurrencyFormatter.formatWithSymbol(line.unitPrice, symbol: currency)}'
                                '${line.type != 'product' ? ' · ${line.type}' : ''}',
                              ),
                              trailing: Text(
                                CurrencyFormatter.formatWithSymbol(
                                  line.total,
                                  symbol: currency,
                                ),
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        _recordTotalsCard(currency, invoice),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _recordInfoCard(String currency, Invoice invoice) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            _recordRow('Date', DateFormat('dd MMM yyyy · HH:mm').format(invoice.dateCreated)),
            _recordRow('Customer', invoice.customerName ?? _currentCustomer.name),
            if ((invoice.customerPhone ?? '').isNotEmpty)
              _recordRow('Phone', invoice.customerPhone!),
            _recordRow('Staff', invoice.staffName?.isNotEmpty == true
                ? invoice.staffName!
                : (invoice.staffId != null ? 'Staff #${invoice.staffId}' : '—')),
            _recordRow(
              'Payment method',
              invoice.paymentMethod?.isNotEmpty == true
                  ? invoice.paymentMethod!
                  : '—',
            ),
            _recordRow('Payment status', invoice.paymentStatus),
            _recordRow(
              'Amount paid',
              CurrencyFormatter.formatWithSymbol(invoice.amountPaid, symbol: currency),
            ),
            _recordRow(
              'Balance',
              CurrencyFormatter.formatWithSymbol(invoice.balanceAmount, symbol: currency),
            ),
          ],
        ),
      ),
    );
  }

  Widget _recordTotalsCard(String currency, Invoice invoice) {
    return Card(
      color: Colors.blueGrey.shade50,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            _recordRow(
              'Subtotal',
              CurrencyFormatter.formatWithSymbol(invoice.subtotal, symbol: currency),
            ),
            if (invoice.taxAmount > 0)
              _recordRow(
                'Tax',
                CurrencyFormatter.formatWithSymbol(invoice.taxAmount, symbol: currency),
              ),
            if (invoice.discountAmount > 0)
              _recordRow(
                'Discount',
                '-${CurrencyFormatter.formatWithSymbol(invoice.discountAmount, symbol: currency)}',
              ),
            const Divider(),
            _recordRow(
              'Invoice total',
              CurrencyFormatter.formatWithSymbol(invoice.totalAmount, symbol: currency),
              bold: true,
            ),
          ],
        ),
      ),
    );
  }

  Widget _recordRow(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontWeight: bold ? FontWeight.bold : FontWeight.w600,
                fontSize: bold ? 15 : 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVirtualAccountCard(ServiceCustomer customer, String currency) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('WALLET BALANCE', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
              Text(
                '₦${customer.balance.abs().toStringAsFixed(2)}',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: customer.balance > 0 ? Colors.red : (customer.balance < 0 ? Colors.green : Colors.black),
                ),
              ),
            ],
          ),
          if (customer.balance > 0)
            const Padding(
              padding: EdgeInsets.only(top: 4.0),
              child: Text(
                'Customer owes you this amount (wallet credit already applied to unpaid purchases).',
                style: TextStyle(color: Colors.red, fontSize: 12),
              ),
            )
          else if (customer.balance < 0)
            const Padding(
              padding: EdgeInsets.only(top: 4.0),
              child: Text('You owe the customer this amount.', style: TextStyle(color: Colors.green, fontSize: 12)),
            ),
          const Divider(height: 24),
          if (customer.virtualAccountNumber != null) ...[
            InkWell(
              onTap: () {
                setState(() {
                  _isVirtualAccountExpanded = !_isVirtualAccountExpanded;
                });
              },
              borderRadius: BorderRadius.circular(4),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('VIRTUAL ACCOUNT DETAILS', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                    Icon(
                      _isVirtualAccountExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                      color: Colors.grey,
                      size: 18,
                    ),
                  ],
                ),
              ),
            ),
            if (_isVirtualAccountExpanded) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade300),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: Colors.deepPurple.shade500,
                          radius: 24,
                          child: Text(
                            customer.virtualAccountName?.isNotEmpty == true ? customer.virtualAccountName![0].toUpperCase() : 'C',
                            style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                (customer.virtualAccountName ?? 'CUSTOMER ACCOUNT').toUpperCase(),
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, letterSpacing: 1.1, color: Colors.black),
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                customer.virtualAccountBank ?? '',
                                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.deepPurple.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        customer.virtualAccountNumber!,
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 2.0, color: Colors.deepPurple.shade900),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.blue.shade50,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.account_balance, size: 14, color: Colors.blue.shade700),
                                    const SizedBox(width: 4),
                                    Text('Bank Info', style: TextStyle(color: Colors.blue.shade900, fontWeight: FontWeight.bold, fontSize: 12)),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Text('Bank Name', style: TextStyle(color: Colors.blue.shade700, fontSize: 10)),
                                Text(customer.virtualAccountBank ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.black)),
                                const SizedBox(height: 8),
                                Text('Type', style: TextStyle(color: Colors.blue.shade700, fontSize: 10)),
                                const Text('Virtual Account', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.black)),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.purple.shade50,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.payments, size: 14, color: Colors.purple.shade700),
                                    const SizedBox(width: 4),
                                    Text('Status', style: TextStyle(color: Colors.purple.shade900, fontWeight: FontWeight.bold, fontSize: 12)),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Text('Account', style: TextStyle(color: Colors.purple.shade700, fontSize: 10)),
                                Text(customer.virtualAccountNumber!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.black)),
                                const SizedBox(height: 8),
                                Text('State', style: TextStyle(color: Colors.purple.shade700, fontSize: 10)),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.green.shade100,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text('ACTIVE', style: TextStyle(color: Colors.green.shade900, fontWeight: FontWeight.bold, fontSize: 10)),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ] else ...[
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _generateVirtualAccount(customer),
                icon: const Icon(Icons.add_card),
                label: const Text('Generate Static Virtual Account'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _generateVirtualAccount(ServiceCustomer customer) async {
    final orgName = context.read<SettingsBloc>().state.settings?.organizationName;
    if (await showFreeTrialVaLockedIfNeeded(context, businessName: orgName)) {
      return;
    }

    final name = customer.name.trim();
    final nameParts = name.split(RegExp(r'\s+')).where((s) => s.isNotEmpty).toList();
    final email = customer.email?.trim() ?? '';
    final phone = customer.phone?.trim() ?? '';

    if (nameParts.length < 2 || email.isEmpty || phone.isEmpty) {
      _showCompleteInfoDialog(customer);
      return;
    }

    _proceedWithVirtualAccountGeneration(customer.id, name, phone, email);
  }

  /// Shows an admin password dialog and returns true if verified.
  Future<bool> _requestAdminPassword() async {
    final passwordController = TextEditingController();
    bool passwordVisible = false;
    String? errorMsg;

    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Row(
            children: const [
              Icon(Icons.admin_panel_settings, color: Colors.deepPurple),
              SizedBox(width: 8),
              Text('System Access Authorisation'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Enter the system access password to generate a virtual account for this customer.',
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
              const SizedBox(height: 16),
              if (errorMsg != null) ...[
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error, color: Colors.red, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(errorMsg!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
              ],
              TextField(
                controller: passwordController,
                obscureText: !passwordVisible,
                autofocus: true,
                decoration: InputDecoration(
                  labelText: 'System Access Password',
                  prefixIcon: const Icon(Icons.lock_outline),
                  border: const OutlineInputBorder(),
                  suffixIcon: IconButton(
                    icon: Icon(passwordVisible ? Icons.visibility : Icons.visibility_off),
                    onPressed: () => setDialogState(() => passwordVisible = !passwordVisible),
                  ),
                ),
                onSubmitted: (_) async {
                  final ok = await SecurityService().verifySuperAdminPassword(passwordController.text);
                  if (ok) {
                    if (ctx.mounted) Navigator.pop(ctx, true);
                  } else {
                    setDialogState(() => errorMsg = 'Incorrect password. Please try again.');
                    passwordController.clear();
                  }
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('CANCEL'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.deepPurple),
              onPressed: () async {
                final ok = await SecurityService().verifySuperAdminPassword(passwordController.text);
                if (ok) {
                  if (ctx.mounted) Navigator.pop(ctx, true);
                } else {
                  setDialogState(() => errorMsg = 'Incorrect password. Please try again.');
                  passwordController.clear();
                }
              },
              child: const Text('VERIFY', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );

    // Wait for the dialog transition animation to complete before disposing
    Future.delayed(const Duration(milliseconds: 300), () {
      passwordController.dispose();
    });
    return result == true;
  }

  Future<void> _showCompleteInfoDialog(ServiceCustomer customer) async {
    final nameController = TextEditingController(text: customer.name);
    final emailController = TextEditingController(text: customer.email);
    final phoneController = TextEditingController(text: customer.phone);
    final formKey = GlobalKey<FormState>();

    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Complete Customer Info'),
        content: Form(
          key: formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Full customer details (First & Last Name, Email, and Phone) are required to generate a virtual account.',
                  style: TextStyle(fontSize: 13, color: Colors.grey),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Customer Full Name',
                    border: OutlineInputBorder(),
                    hintText: 'e.g. Kelvin Nwosu',
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) return 'Full name is required';
                    if (val.trim().split(RegExp(r'\s+')).length < 2) {
                      return 'Please enter both first and last name';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: emailController,
                  decoration: const InputDecoration(
                    labelText: 'Email Address',
                    border: OutlineInputBorder(),
                    hintText: 'e.g. customer@example.com',
                  ),
                  keyboardType: TextInputType.emailAddress,
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) return 'Email is required';
                    if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(val.trim())) {
                      return 'Enter a valid email address';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: phoneController,
                  decoration: const InputDecoration(
                    labelText: 'Phone Number',
                    border: OutlineInputBorder(),
                    hintText: 'e.g. 08012345678',
                  ),
                  keyboardType: TextInputType.phone,
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) return 'Phone number is required';
                    final digitsOnly = val.replaceAll(RegExp(r'\D'), '');
                    if (digitsOnly.length < 11 || digitsOnly.length > 15) {
                      return 'Phone must be 11 to 15 digits';
                    }
                    return null;
                  },
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('CANCEL'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (formKey.currentState?.validate() ?? false) {
                final newName = nameController.text.trim();
                final newEmail = emailController.text.trim();
                final newPhone = phoneController.text.trim();

                Navigator.pop(context); // Close info input dialog

                // Update local SQLite database
                try {
                  final svcRepo = this.context.read<IServicesRepository>();
                  await svcRepo.updateCustomerBasicInfo(
                    id: customer.id,
                    name: newName,
                    email: newEmail,
                    phone: newPhone,
                  );
                } catch (e) {
                  // ignore
                }

                // Update UI state
                setState(() {
                  _currentCustomer = _currentCustomer.copyWith(
                    name: newName,
                    email: newEmail,
                    phone: newPhone,
                  );
                });

                // Generate virtual account with new details
                _proceedWithVirtualAccountGeneration(customer.id, newName, newPhone, newEmail);
              }
            },
            child: const Text('SAVE & GENERATE'),
          ),
        ],
      ),
    );
  }

  Future<void> _proceedWithVirtualAccountGeneration(
    String customerId,
    String customerName,
    String customerPhone,
    String email,
  ) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: InvifyLoadingIndicator(message: 'Provisioning Virtual Account...')),
    );

    try {
      final financeRepo = context.read<FinanceRepository>();
      final result = await financeRepo.initiateCustomerVirtualAccount(
        customerId: customerId,
        customerName: customerName,
        customerPhone: customerPhone,
        email: email,
      );

      if (mounted) {
        Navigator.pop(context); // Close loading dialog
        
        if (result['accountNumber'] != null) {
          final acctNum = result['accountNumber'];
          final bankName = result['bankName'];
          final acctName = result['accountName'] ?? customerName;
          
          try {
            final svcRepo = context.read<IServicesRepository>();
            await svcRepo.updateCustomerVirtualAccount(customerId, acctNum, bankName, accountName: acctName);
          } catch (e) {
            // Ignore if repository is not injected or fails
          }
          
          setState(() {
            _currentCustomer = _currentCustomer.copyWith(
              virtualAccountNumber: acctNum,
              virtualAccountBank: bankName,
              virtualAccountName: acctName,
            );
          });
          
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Virtual account generated successfully!')),
          );
        } else {
          await showVirtualAccountFailureDialog(
            context,
            'Failed to provision customer virtual account',
            subject: 'customer virtual account',
          );
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // Close loading dialog
        await showVirtualAccountFailureDialog(
          context,
          e,
          subject: 'customer virtual account',
        );
      }
    }
  }
}

class _PurchasedItem {
  final DateTime date;
  final String name;
  final int quantity;
  final double unitPrice;
  final String invoiceNumber;
  final Invoice invoice;

  _PurchasedItem({
    required this.date,
    required this.name,
    required this.quantity,
    required this.unitPrice,
    required this.invoiceNumber,
    required this.invoice,
  });
}
