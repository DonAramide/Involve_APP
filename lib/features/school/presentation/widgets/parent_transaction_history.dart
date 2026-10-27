import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/invoicing/domain/repositories/invoice_repository.dart';
import 'package:involve_app/features/invoicing/presentation/pages/receipt_preview_page.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/school/domain/services/parent_transaction_history.dart';
import 'package:involve_app/features/school/presentation/bloc/school_bloc.dart';

class ParentTransactionHistory extends StatefulWidget {
  final int parentId;
  final List<Student> children;
  final int reloadTick;
  final void Function(ParentPaymentRecord payment) onPrintPayment;
  final void Function(ParentPaymentRecord payment) onPdfPayment;

  const ParentTransactionHistory({
    super.key,
    required this.parentId,
    required this.children,
    required this.reloadTick,
    required this.onPrintPayment,
    required this.onPdfPayment,
  });

  @override
  State<ParentTransactionHistory> createState() => _ParentTransactionHistoryState();
}

class _ParentTransactionHistoryState extends State<ParentTransactionHistory> {
  final _search = TextEditingController();
  ParentTxnKindFilter _kind = ParentTxnKindFilter.all;
  int? _childId;
  DateTimeRange? _range;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<List<ParentTxnRow>> _load() async {
    final payments =
        await context.read<SchoolBloc>().repository.getParentPayments(widget.parentId);
    final invoices = <Invoice>[];
    try {
      final invoiceRepo = context.read<InvoiceRepository>();
      for (final child in widget.children) {
        final id = child.id;
        if (id == null) continue;
        invoices.addAll(await invoiceRepo.getInvoicesByStudentId(id));
      }
    } catch (_) {}
    return buildParentTransactions(payments: payments, invoices: invoices);
  }

  String _childName(int? id) {
    if (id == null) return '';
    for (final s in widget.children) {
      if (s.id == id) return s.fullName;
    }
    return 'Student $id';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Parent Transaction History', style: TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            _kindChip('All', ParentTxnKindFilter.all),
            _kindChip('Parent payments', ParentTxnKindFilter.parentPayments),
            _kindChip('Paid bills', ParentTxnKindFilter.paidBills),
          ],
        ),
        if (widget.children.length > 1) ...[
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              FilterChip(
                label: const Text('All children'),
                selected: _childId == null,
                onSelected: (_) => setState(() => _childId = null),
              ),
              ...widget.children.map(
                (s) => FilterChip(
                  label: Text(s.fullName),
                  selected: _childId == s.id,
                  onSelected: (_) => setState(() => _childId = s.id),
                ),
              ),
            ],
          ),
        ],
        const SizedBox(height: 8),
        TextField(
          controller: _search,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            hintText: 'Search amount, reference, method…',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: _search.text.isEmpty
                ? null
                : IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () {
                      _search.clear();
                      setState(() {});
                    },
                  ),
            isDense: true,
            border: const OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerLeft,
          child: FilterChip(
            avatar: const Icon(Icons.date_range, size: 18),
            label: Text(
              _range == null
                  ? 'Any date'
                  : '${DateFormat('dd MMM').format(_range!.start)} – ${DateFormat('dd MMM').format(_range!.end)}',
            ),
            selected: _range != null,
            onSelected: (_) async {
              if (_range != null) {
                setState(() => _range = null);
                return;
              }
              final now = DateTime.now();
              final picked = await showDateRangePicker(
                context: context,
                firstDate: DateTime(now.year - 5),
                lastDate: DateTime(now.year + 1),
                initialDateRange: DateTimeRange(
                  start: DateTime(now.year, now.month, 1),
                  end: now,
                ),
              );
              if (picked != null) setState(() => _range = picked);
            },
          ),
        ),
        const SizedBox(height: 8),
        FutureBuilder<List<ParentTxnRow>>(
          key: ValueKey(widget.reloadTick),
          future: _load(),
          builder: (context, snap) {
            if (!snap.hasData) {
              return const Padding(
                padding: EdgeInsets.all(12),
                child: Text('Loading transactions…'),
              );
            }
            final filtered = filterParentTransactions(
              snap.data!,
              ParentTxnQuery(
                kind: _kind,
                studentId: _childId,
                search: _search.text,
                from: _range?.start,
                to: _range?.end,
              ),
            );
            if (filtered.isEmpty) {
              return const Text('No transactions match these filters.');
            }
            return Column(
              children: filtered.map(_tile).toList(),
            );
          },
        ),
      ],
    );
  }

  Widget _kindChip(String label, ParentTxnKindFilter value) {
    return FilterChip(
      label: Text(label),
      selected: _kind == value,
      onSelected: (_) => setState(() => _kind = value),
    );
  }

  Widget _tile(ParentTxnRow row) {
    final when = DateFormat('dd MMM yyyy HH:mm').format(row.at);
    if (row.payment != null) {
      final p = row.payment!;
      return Card(
        child: ExpansionTile(
          title: Text(CurrencyFormatter.formatWithSymbol(p.amount)),
          subtitle: Text('$when · Parent payment · ${row.methodLabel}'),
          children: [
            ListTile(
              dense: true,
              title: Text(
                'Applied ${CurrencyFormatter.formatWithSymbol(p.appliedToDebt)} · '
                'Credit ${CurrencyFormatter.formatWithSymbol(p.toCredit)}',
              ),
              subtitle: Text('Ref ${p.reference}'),
            ),
            ...p.allocations.map((a) {
              return ListTile(
                dense: true,
                title: Text(_childName(a.studentId)),
                subtitle: Text(
                  'Before ${CurrencyFormatter.formatWithSymbol(a.outstandingBefore)} → '
                  'allocated ${CurrencyFormatter.formatWithSymbol(a.allocated)} → '
                  'after ${CurrencyFormatter.formatWithSymbol(a.outstandingAfter)}',
                ),
              );
            }),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => widget.onPrintPayment(p),
                      icon: const Icon(Icons.print, size: 18),
                      label: const Text('Print'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => widget.onPdfPayment(p),
                      icon: const Icon(Icons.picture_as_pdf, size: 18),
                      label: const Text('PDF'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final bill = row.bill!;
    final child = _childName(bill.studentId);
    return Card(
      child: ExpansionTile(
        title: Text(CurrencyFormatter.formatWithSymbol(bill.amountPaid)),
        subtitle: Text(
          '$when · Paid bill'
          '${child.isEmpty ? '' : ' · $child'}'
          ' · ${row.methodLabel}',
        ),
        trailing: Text(
          bill.displayPaymentStatus,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: bill.isFullySettled ? Colors.green.shade700 : Colors.orange.shade800,
          ),
        ),
        children: [
          ListTile(
            dense: true,
            title: Text('Bill ${bill.invoiceNumber}'),
            subtitle: Text(
              'Billed ${CurrencyFormatter.formatWithSymbol(bill.totalAmount)} · '
              'Balance ${CurrencyFormatter.formatWithSymbol(bill.displayBalance)}',
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ReceiptPreviewPage(
                        invoice: bill,
                        receiptTitle: 'ACADEMIC BILL',
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.receipt_long, size: 18),
                label: const Text('View bill'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
