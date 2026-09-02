import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/core/utils/terminology.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/invoicing/domain/repositories/invoice_repository.dart';
import 'package:involve_app/features/invoicing/presentation/pages/receipt_preview_page.dart';
import 'package:involve_app/features/school_finance/data/models/finance_models.dart';
import 'package:involve_app/features/school_finance/domain/repositories/finance_repository_new.dart';
import 'package:involve_app/features/services/domain/entities/service_job.dart';
import 'package:involve_app/features/services/domain/repositories/services_repository.dart';
import 'package:involve_app/features/services/presentation/templates/service_pdf_generator.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';

class TransactionAuditPage extends StatefulWidget {
  const TransactionAuditPage({Key? key}) : super(key: key);

  @override
  _TransactionAuditPageState createState() => _TransactionAuditPageState();
}

class _TxRow {
  final TransactionAuditModel audit;
  final Invoice? invoice;
  final ServiceJob? serviceJob;

  const _TxRow({required this.audit, this.invoice, this.serviceJob});
}

class _TransactionAuditPageState extends State<TransactionAuditPage> {
  List<_TxRow> _all = [];
  bool _isLoading = true;
  String? _error;

  String _methodFilter = 'All';
  String _statusFilter = 'All';
  final TextEditingController _searchCtrl = TextEditingController();
  int _page = 1;
  static const int _pageSize = 25;

  static const _methodFilters = [
    'All',
    'Cash',
    'POS',
    'Transfer',
    'Wallet',
    'Credit',
  ];

  static const _statusFilters = [
    'All',
    'Paid',
    'Unsettled',
    'Pending',
    'Payment Pending',
    'Customer Debit',
    'Failed',
  ];

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(() {
      if (_page != 1) {
        _page = 1;
      }
      setState(() {});
    });
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  String _normalizeMethod(String? raw) {
    final m = (raw ?? '').trim().toLowerCase();
    if (m == 'unpaid' || m == 'none' || m == '—') return 'Unpaid';
    if (m.contains('pos') || m.contains('card') || m.contains('emv')) return 'POS';
    if (m.contains('transfer') || m.contains('virtual')) return 'Transfer';
    if (m.contains('wallet')) return 'Wallet';
    if (m.contains('credit') || m == 'clear') return 'Credit';
    if (m.contains('cash')) return 'Cash';
    if (m.contains('pay later') || m.contains('paylater')) return 'Pay Later';
    return raw?.trim().isNotEmpty == true ? raw!.trim() : 'Cash';
  }

  bool _isCommittedOnAccount(String? methodRaw) {
    final m = (methodRaw ?? '').trim().toLowerCase();
    return m.contains('credit') ||
        m.contains('pay later') ||
        m.contains('paylater') ||
        m == 'clear';
  }

  String _normalizeStatus(String? raw) {
    final s = (raw ?? '').trim().toLowerCase();
    if (s.isEmpty) return 'Pending';
    if (s.contains('fail') ||
        s.contains('declin') ||
        s.contains('abort') ||
        s.contains('cancel')) {
      return 'Failed';
    }
    if (s.contains('unsettled')) return 'Unsettled';
    if (s.contains('payment pending') ||
        s == 'unpaid' ||
        s.contains('unpaid') ||
        s.contains('owing')) {
      return 'Payment Pending';
    }
    if (s.contains('debit') ||
        s == 'deferred' ||
        s.contains('pay later') ||
        s.contains('paylater')) {
      return 'Customer Debit';
    }
    if (s.contains('partial')) return 'Pending';
    if (s.contains('pend') || s.contains('await')) return 'Pending';
    if (s.contains('settled') && !s.contains('unsettled')) return 'Paid';
    if (s == 'paid' ||
        s.startsWith('paid ') ||
        s.contains('approved') ||
        s.contains('success')) {
      return 'Paid';
    }
    return raw!.trim();
  }

  IconData _methodIcon(String method) {
    switch (_normalizeMethod(method)) {
      case 'POS':
        return Icons.credit_card;
      case 'Transfer':
        return Icons.account_balance;
      case 'Wallet':
        return Icons.account_balance_wallet;
      case 'Credit':
        return Icons.savings_outlined;
      case 'Pay Later':
        return Icons.schedule;
      case 'Unpaid':
        return Icons.hourglass_empty;
      default:
        return Icons.payments;
    }
  }

  Color _statusColor(TransactionAuditModel tx) {
    switch (_effectiveStatus(tx)) {
      case 'Paid':
        return Colors.green;
      case 'Unsettled':
        return const Color(0xFFF9A825); // amber / yellow
      case 'Pending':
      case 'Payment Pending':
        return Colors.orange;
      case 'Customer Debit':
        return const Color(0xFF0277BD);
      case 'Failed':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  /// Prefer settlement-aware status over raw processor "Approved".
  String _effectiveStatus(TransactionAuditModel tx) {
    if (tx.isCardUnsettled) return 'Unsettled';
    if (tx.isCardSettled) return 'Paid';
    return _normalizeStatus(tx.status);
  }

  String _displayStatus(TransactionAuditModel tx) {
    if (tx.isCardUnsettled) return 'Approved (unsettled)';
    if (tx.isCardSettled) return 'Settled';
    if (_effectiveStatus(tx) == 'Payment Pending') return 'Payment Pending';
    return tx.status;
  }

  String _rowMethodStatus(TransactionAuditModel tx) {
    if (_effectiveStatus(tx) == 'Payment Pending') return 'Payment Pending';
    return '${tx.paymentMethod} · ${_displayStatus(tx)}';
  }

  Color _rowBackground(TransactionAuditModel tx) {
    if (tx.isCardUnsettled) {
      return const Color(0xFFFFF8E1); // light yellow
    }
    return Colors.transparent;
  }

  List<Map<String, dynamic>> _jobItemMaps(ServiceJob job) {
    if (job.items.isNotEmpty) {
      return job.items
          .map((i) => {'name': i.name, 'quantity': i.quantity.toInt()})
          .toList();
    }
    return [
      {'name': job.title, 'quantity': 1}
    ];
  }

  _TxRow _pendingPaymentJobRow(ServiceJob job) {
    final owing = job.balance > 1e-9 ? job.balance : job.totalAmount;
    return _TxRow(
      serviceJob: job,
      audit: TransactionAuditModel(
        id: 'pending-${job.id}',
        type: 'SERVICE',
        paymentMethod: 'Unpaid',
        amount: owing,
        status: 'Payment Pending',
        staffName: 'Staff',
        date: job.createdAt,
        items: _jobItemMaps(job),
        customerName: job.customerName ?? 'Client',
        reference: job.jobId,
      ),
    );
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final invoiceRepo = context.read<InvoiceRepository>();
      final financeRepo = context.read<FinanceRepository>();

      final invoices = await invoiceRepo.getAllInvoices();
      invoices.sort((a, b) => b.dateCreated.compareTo(a.dateCreated));

      final Map<String, _TxRow> byKey = {};

      for (final inv in invoices.take(300)) {
        // Service jobs are mirrored into getAllInvoices(). List them from
        // real payments / outstanding balance below so a new unpaid job is
        // not shown as Cash · Paid.
        if (inv.invoiceNumber.startsWith('INV-SRV')) continue;

        final noMoneyIn = inv.amountPaid <= 1e-9;
        final methodRaw = (inv.paymentMethod ?? '').trim();
        final statusRaw = (inv.paymentStatus ?? '').trim().toLowerCase();
        final awaitingTransfer = methodRaw.toLowerCase().contains('transfer') ||
            methodRaw.toLowerCase().contains('virtual') ||
            statusRaw.contains('pend') ||
            statusRaw.contains('await');

        final String method;
        final String status;
        final double amount;
        if (noMoneyIn) {
          if (awaitingTransfer) {
            method = _normalizeMethod(methodRaw);
            status = 'Pending';
          } else if (_isCommittedOnAccount(methodRaw)) {
            method = 'Credit';
            status = 'Customer Debit';
          } else {
            method = methodRaw.isEmpty ? 'Unpaid' : _normalizeMethod(methodRaw);
            status = 'Payment Pending';
          }
          amount =
              inv.balanceAmount > 1e-9 ? inv.balanceAmount : inv.totalAmount;
        } else {
          method = _normalizeMethod(inv.paymentMethod);
          status = _normalizeStatus(inv.paymentStatus);
          amount = inv.amountPaid;
        }

        final key = 'inv:${inv.id ?? inv.invoiceNumber}';
        byKey[key] = _TxRow(
          invoice: inv,
          audit: TransactionAuditModel(
            id: inv.id?.toString() ?? inv.invoiceNumber,
            type: 'INVOICE',
            paymentMethod: method,
            amount: amount,
            status: status,
            staffName: inv.staffName ?? 'System',
            date: inv.dateCreated,
            items: inv.items
                .map((i) => {
                      'name': i.item.name,
                      'quantity': i.quantity,
                    })
                .toList(),
            customerName: inv.customerName ??
                (inv.admissionNumber != null
                    ? 'Student ${inv.admissionNumber}'
                    : 'Walk-in'),
            reference: inv.invoiceNumber,
          ),
        );
      }

      try {
        final remote = await financeRepo.getTransactionAuditLedger();
        for (final tx in remote) {
          final ref = tx.reference.trim();
          final already = byKey.values.any((row) {
            final r = row.audit.reference.trim();
            return (ref.isNotEmpty && r == ref) ||
                row.audit.id == tx.id ||
                (row.invoice?.invoiceNumber == ref);
          });
          if (already) continue;
          byKey['audit:${tx.id}:$ref'] = _TxRow(
            audit: TransactionAuditModel(
              id: tx.id,
              type: tx.type.isNotEmpty ? tx.type : 'POS',
              paymentMethod: _normalizeMethod(tx.paymentMethod),
              amount: tx.amount,
              status: _normalizeStatus(tx.status),
              staffName: tx.staffName,
              date: tx.date,
              items: tx.items,
              customerName: tx.customerName,
              reference: tx.reference,
            ),
          );
        }
      } catch (_) {
        // Local invoices are enough when remote audit is unavailable.
      }

      // Load Service Jobs and Payments
      try {
        final servicesRepo = context.read<IServicesRepository>();
        final serviceJobs = await servicesRepo.getJobs();
        for (final job in serviceJobs) {
          final payments = await servicesRepo.getJobPayments(job.id);
          if (payments.isNotEmpty) {
            for (final pmt in payments) {
              final ref = pmt.reference?.isNotEmpty == true ? pmt.reference! : job.jobId;
              final key = 'srv_pmt:${pmt.id}';
              byKey[key] = _TxRow(
                serviceJob: job,
                audit: TransactionAuditModel(
                  id: pmt.id,
                  type: 'SERVICE',
                  paymentMethod: _normalizeMethod(pmt.method),
                  amount: pmt.amount,
                  status: 'Paid',
                  staffName: 'Staff',
                  date: pmt.createdAt,
                  items: _jobItemMaps(job),
                  customerName: job.customerName ?? 'Client',
                  reference: ref,
                ),
              );
            }
          } else if (job.amountPaid > 1e-9) {
            final key = 'srv_job:${job.id}';
            byKey[key] = _TxRow(
              serviceJob: job,
              audit: TransactionAuditModel(
                id: job.id,
                type: 'SERVICE',
                paymentMethod: 'Cash',
                amount: job.amountPaid,
                status: 'Paid',
                staffName: 'Staff',
                date: job.createdAt,
                items: _jobItemMaps(job),
                customerName: job.customerName ?? 'Client',
                reference: job.jobId,
              ),
            );
          }

          if (job.status.toLowerCase() != 'cancelled' && job.balance > 1e-9) {
            byKey['srv_pending:${job.id}'] = _pendingPaymentJobRow(job);
          }
        }
      } catch (_) {}

      final merged = byKey.values.toList()
        ..sort((a, b) => b.audit.date.compareTo(a.audit.date));

      setState(() {
        _all = merged;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  List<_TxRow> get _filtered {
    final q = _searchCtrl.text.trim().toLowerCase();
    return _all.where((row) {
      final tx = row.audit;
      final method = _normalizeMethod(tx.paymentMethod);
      final status = _effectiveStatus(tx);

      if (_methodFilter != 'All' && method != _methodFilter) return false;
      if (_statusFilter != 'All' && status != _statusFilter) return false;

      if (q.isEmpty) return true;
      final hay = [
        tx.customerName,
        tx.reference,
        tx.staffName,
        tx.paymentMethod,
        tx.status,
        _displayStatus(tx),
        method,
      ].join(' ').toLowerCase();
      return hay.contains(q);
    }).toList();
  }

  List<_TxRow> get _paged {
    final rows = _filtered;
    final start = (_page - 1) * _pageSize;
    if (start >= rows.length) return const [];
    final end = (start + _pageSize).clamp(0, rows.length);
    return rows.sublist(start, end);
  }

  int get _totalPages {
    final n = _filtered.length;
    if (n == 0) return 1;
    return ((n + _pageSize - 1) / _pageSize).floor();
  }

  void _showDetails(_TxRow row) {
    final tx = row.audit;
    final invoice = row.invoice;
    final serviceJob = row.serviceJob;
    final theme = Theme.of(context);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  CurrencyFormatter.format(tx.amount),
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _displayStatus(tx),
                  style: TextStyle(
                    color: _statusColor(tx),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (tx.isCardSettled && tx.settledAt != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'Processor settled ${DateFormat('MMM dd, yyyy HH:mm').format(tx.settledAt!)}',
                      style: TextStyle(color: Colors.green.shade700, fontSize: 12),
                    ),
                  ),
                const SizedBox(height: 16),
                _detailLine('Reference', tx.reference.isNotEmpty ? tx.reference : '—'),
                _detailLine('Customer', tx.customerName.isNotEmpty ? tx.customerName : '—'),
                _detailLine('Staff', tx.staffName),
                _detailLine(
                  'Date',
                  DateFormat('EEE, MMM dd yyyy · HH:mm').format(tx.date),
                ),
                _detailLine('Source', tx.type),
                if (invoice != null) ...[
                  _detailLine(
                    'Invoice total',
                    CurrencyFormatter.format(invoice.totalAmount),
                  ),
                  if (invoice.amountPaid > 0)
                    _detailLine(
                      'Amount paid',
                      CurrencyFormatter.format(invoice.amountPaid),
                    ),
                  if (invoice.balanceAmount != 0)
                    _detailLine(
                      'Balance',
                      CurrencyFormatter.format(invoice.balanceAmount),
                    ),
                ] else if (serviceJob != null) ...[
                  _detailLine(
                    'Job total',
                    CurrencyFormatter.format(serviceJob.totalAmount),
                  ),
                  if (serviceJob.amountPaid > 0)
                    _detailLine(
                      'Amount paid',
                      CurrencyFormatter.format(serviceJob.amountPaid),
                    ),
                  if (serviceJob.balance != 0)
                    _detailLine(
                      'Remaining balance',
                      CurrencyFormatter.format(serviceJob.balance),
                    ),
                ],
                if (tx.items.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text('Items', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  ...tx.items.take(12).map((i) {
                    if (i is Map) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text('• ${i['name'] ?? 'Item'} ×${i['quantity'] ?? 1}'),
                      );
                    }
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text('• $i'),
                    );
                  }),
                ],
                const SizedBox(height: 16),
                Row(
                  children: [
                    if (invoice != null) ...[
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Navigator.pop(ctx);
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ReceiptPreviewPage(invoice: invoice),
                              ),
                            );
                          },
                          icon: const Icon(Icons.receipt_long),
                          label: const Text('Receipt'),
                        ),
                      ),
                      const SizedBox(width: 12),
                    ] else if (serviceJob != null) ...[
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () async {
                            Navigator.pop(ctx);
                            final settings = context.read<SettingsBloc>().state.settings;
                            final payments = await context.read<IServicesRepository>().getJobPayments(serviceJob.id);
                            await ServiceJobPdfGenerator.generateAndShow(
                              job: serviceJob,
                              payments: payments,
                              settings: settings,
                            );
                          },
                          icon: const Icon(Icons.receipt_long),
                          label: const Text('Receipt'),
                        ),
                      ),
                      const SizedBox(width: 12),
                    ],
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('Close'),
                      ),
                    ),
                  ],
                ),
                if (serviceJob != null &&
                    _effectiveStatus(tx) == 'Payment Pending' &&
                    serviceJob.status.toLowerCase() != 'cancelled' &&
                    serviceJob.amountPaid <= 1e-9) ...[
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: TextButton.icon(
                      onPressed: () async {
                        Navigator.pop(ctx);
                        final confirmed = await showDialog<bool>(
                          context: context,
                          builder: (dCtx) => AlertDialog(
                            title: const Text('Cancel this job?'),
                            content: Text(
                              'No payment has been recorded for "${serviceJob.title}". '
                              'Cancelling removes it from Payment Pending.',
                            ),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(dCtx, false), child: const Text('Keep job')),
                              TextButton(
                                onPressed: () => Navigator.pop(dCtx, true),
                                child: const Text('Cancel job', style: TextStyle(color: Colors.red)),
                              ),
                            ],
                          ),
                        );
                        if (confirmed != true || !context.mounted) return;
                        try {
                          await context.read<IServicesRepository>().updateJobStatus(serviceJob.id, 'cancelled');
                          if (!context.mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Job cancelled. No payment is due.')),
                          );
                          await _load();
                        } catch (e) {
                          if (!context.mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(e.toString().replaceAll('Exception: ', '')),
                              backgroundColor: Colors.red,
                            ),
                          );
                        }
                      },
                      icon: const Icon(Icons.cancel_outlined, color: Colors.red),
                      label: const Text('Cancel job', style: TextStyle(color: Colors.red)),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _detailLine(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _chipRow({
    required List<String> options,
    required String selected,
    required ValueChanged<String> onSelected,
  }) {
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: options.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final opt = options[i];
          final selectedNow = opt == selected;
          return ChoiceChip(
            label: Text(opt, style: const TextStyle(fontSize: 12)),
            selected: selectedNow,
            onSelected: (_) => onSelected(opt),
            visualDensity: VisualDensity.compact,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<SettingsBloc>().state.settings;
    final title = settings?.transactionHistoryLabel ?? 'Transaction History';
    final customerLabel = settings?.customerLabel ?? 'Customer';
    final rows = _paged;
    final total = _filtered.length;
    final totalPages = _totalPages;

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _load,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text('Error: $_error', style: const TextStyle(color: Colors.red)),
                      ),
                      ElevatedButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  ),
                )
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                      child: TextField(
                        controller: _searchCtrl,
                        decoration: InputDecoration(
                          hintText: 'Search $customerLabel, ref, staff…',
                          prefixIcon: const Icon(Icons.search, size: 20),
                          isDense: true,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 6),
                      child: _chipRow(
                        options: _methodFilters,
                        selected: _methodFilter,
                        onSelected: (v) => setState(() {
                          _methodFilter = v;
                          _page = 1;
                        }),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: _chipRow(
                        options: _statusFilters,
                        selected: _statusFilter,
                        onSelected: (v) => setState(() {
                          _statusFilter = v;
                          _page = 1;
                        }),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          total == 0
                              ? '0 payments'
                              : '${((_page - 1) * _pageSize) + 1}–${((_page - 1) * _pageSize) + rows.length} of $total · $_pageSize per page',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Expanded(
                      child: rows.isEmpty
                          ? Center(
                              child: Text(
                                'No payments match these filters.',
                                style: TextStyle(color: Colors.grey.shade600),
                              ),
                            )
                          : RefreshIndicator(
                              onRefresh: _load,
                              child: ListView.builder(
                                physics: const AlwaysScrollableScrollPhysics(),
                                itemCount: rows.length,
                                itemBuilder: (context, index) {
                                  final row = rows[index];
                                  final tx = row.audit;
                                  final statusColor = _statusColor(tx);
                                  return Card(
                                    color: tx.isCardUnsettled
                                        ? const Color(0xFFFFF8E1)
                                        : null,
                                    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                                    child: ListTile(
                                      onTap: () => _showDetails(row),
                                      tileColor: _rowBackground(tx),
                                      leading: CircleAvatar(
                                        backgroundColor: statusColor.withOpacity(0.18),
                                        child: Icon(
                                          _methodIcon(tx.paymentMethod),
                                          color: statusColor,
                                          size: 20,
                                        ),
                                      ),
                                      title: Text(
                                        CurrencyFormatter.format(tx.amount),
                                        style: const TextStyle(fontWeight: FontWeight.bold),
                                      ),
                                      subtitle: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            tx.customerName.isNotEmpty
                                                ? tx.customerName
                                                : customerLabel,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          Text(
                                            _rowMethodStatus(tx),
                                            style: TextStyle(
                                              color: statusColor,
                                              fontWeight: FontWeight.w600,
                                              fontSize: 12,
                                            ),
                                          ),
                                          Text(
                                            DateFormat('MMM dd, yyyy HH:mm').format(tx.date),
                                            style: const TextStyle(fontSize: 11, color: Colors.grey),
                                          ),
                                        ],
                                      ),
                                      isThreeLine: true,
                                      trailing: const Icon(Icons.chevron_right),
                                    ),
                                  );
                                },
                              ),
                            ),
                    ),
                    if (total > _pageSize)
                      SafeArea(
                        top: false,
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              IconButton(
                                onPressed: _page > 1
                                    ? () => setState(() => _page -= 1)
                                    : null,
                                icon: const Icon(Icons.chevron_left),
                              ),
                              Text(
                                'Page $_page of $totalPages',
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                              IconButton(
                                onPressed: _page < totalPages
                                    ? () => setState(() => _page += 1)
                                    : null,
                                icon: const Icon(Icons.chevron_right),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
    );
  }
}
