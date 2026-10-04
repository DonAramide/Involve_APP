import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/school/presentation/bloc/school_bloc.dart';
import 'package:involve_app/features/school/presentation/pages/parent_profile_page.dart';
import 'package:involve_app/features/school_finance/domain/entities/financial_transaction.dart';

class PaymentTransactionDetailsPage extends StatefulWidget {
  final FinancialTransaction transaction;

  const PaymentTransactionDetailsPage({super.key, required this.transaction});

  @override
  State<PaymentTransactionDetailsPage> createState() => _PaymentTransactionDetailsPageState();
}

class _PaymentTransactionDetailsPageState extends State<PaymentTransactionDetailsPage> {
  SchoolParent? _parent;
  List<Student> _children = const [];
  Map<int, String> _classNames = const {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final tx = widget.transaction;
    try {
      final repo = context.read<SchoolBloc>().repository;
      final va = _accountNumber(tx);
      SchoolParent? parent;
      if (va.isNotEmpty) {
        parent = await repo.findParentByVirtualAccount(va);
      }
      final ref = tx.reference.trim();
      if (parent == null && ref.isNotEmpty) {
        final parents = await repo.getParents();
        for (final candidate in parents) {
          if (candidate.id == null) continue;
          final payments = await repo.getParentPayments(candidate.id!);
          final hit = payments.any((payment) {
            final stored = payment.reference.trim();
            return stored.isNotEmpty && (stored == ref || ref.contains(stored) || stored.contains(ref));
          });
          if (hit) {
            parent = candidate;
            break;
          }
        }
      }
      if (parent == null &&
          (tx.metadata['quasar'] == true ||
              tx.metadata['fee'] == true ||
              tx.walletId.trim() == 'fee' ||
              tx.walletId.trim() == 'quasar')) {
        final parents = await repo.getParents();
        final withAccount = parents
            .where((p) => (p.virtualAccountNumber ?? '').trim().isNotEmpty)
            .toList();
        if (withAccount.length == 1) parent = withAccount.first;
      }
      final children = parent?.id == null
          ? <Student>[]
          : (await repo.getStudents()).where((s) => s.parentId == parent!.id).toList();
      final classes = await repo.getClasses();
      final names = <int, String>{};
      for (final schoolClass in classes) {
        if (schoolClass.id != null) names[schoolClass.id!] = schoolClass.name;
      }
      if (!mounted) return;
      setState(() {
        _parent = parent;
        _children = children;
        _classNames = names;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tx = widget.transaction;
    final money = CurrencyFormatter.formatWithSymbol(tx.amount.abs());
    final when = DateFormat('dd MMM yyyy, HH:mm').format(tx.createdAt);
    final va = _accountNumber(tx);
    final sender = '${tx.metadata['student_name'] ?? tx.description}'.trim();
    final isFee = tx.metadata['fee'] == true || tx.walletId.trim() == 'fee';

    return Scaffold(
      appBar: AppBar(title: Text(isFee ? 'Fee details' : 'Payment details')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  '${tx.amount < 0 ? '−' : '+'}$money',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: tx.amount < 0 ? Colors.red.shade700 : Colors.green.shade700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(when, style: const TextStyle(color: Colors.blueGrey)),
                const SizedBox(height: 16),
                _row('From', sender.isEmpty ? 'Virtual account' : sender),
                _row('Reference', tx.reference),
                _row('Method', isFee ? 'Service fee' : (tx.channel.isEmpty ? 'Virtual account' : tx.channel)),
                if (va.isNotEmpty) _row('Virtual account', va),
                if ((tx.metadata['payment_method'] ?? '').toString().trim().isNotEmpty)
                  _row('Paid via', '${tx.metadata['payment_method']}'),
                const SizedBox(height: 12),
                const Text('Parent', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                if (_parent == null)
                  const Text(
                    'This payment is not linked to a parent on this device.',
                    style: TextStyle(color: Colors.blueGrey),
                  )
                else ...[
                  Card(
                    child: ListTile(
                      title: Text(_parent!.fullName),
                      subtitle: Text(
                        [
                          if ((_parent!.phone ?? '').trim().isNotEmpty) _parent!.phone!,
                          if ((_parent!.virtualAccountNumber ?? '').trim().isNotEmpty)
                            'VA ${_parent!.virtualAccountNumber}',
                        ].join(' · '),
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () {
                        final id = _parent!.id;
                        if (id == null) return;
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => ParentProfilePage(parentId: id)),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text('Student', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  if (_children.isEmpty)
                    const Text(
                      'This parent has no student on this device.',
                      style: TextStyle(color: Colors.blueGrey),
                    )
                  else
                    ..._children.map((student) {
                      final className = _classNames[student.classId] ?? '';
                      return Card(
                        child: ListTile(
                          title: Text(student.fullName),
                          subtitle: Text(
                            [
                              if (className.isNotEmpty) className,
                              student.admissionNumber,
                            ].join(' · '),
                          ),
                        ),
                      );
                    }),
                ],
              ],
            ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.blueGrey)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

String _accountNumber(FinancialTransaction tx) {
  for (final key in ['virtualAccountNumber', 'accountNumber', 'virtual_account_number']) {
    final value = '${tx.metadata[key] ?? ''}'.trim();
    if (value.isNotEmpty) return value;
  }
  return '';
}
