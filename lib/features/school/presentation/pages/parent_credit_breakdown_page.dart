import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:involve_app/core/services/service_locator.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/school/domain/repositories/school_repository.dart';
import 'package:involve_app/features/school/domain/services/parent_credit_breakdown.dart';
import 'package:involve_app/features/school/domain/services/parent_payment_receipt_service.dart';
import 'package:involve_app/features/school_finance/domain/repositories/finance_repository_new.dart';

class ParentCreditBreakdownPage extends StatefulWidget {
  final SchoolParent parent;
  final SchoolRepository schoolRepository;

  const ParentCreditBreakdownPage({
    super.key,
    required this.parent,
    required this.schoolRepository,
  });

  @override
  State<ParentCreditBreakdownPage> createState() => _ParentCreditBreakdownPageState();
}

class _ParentCreditBreakdownPageState extends State<ParentCreditBreakdownPage> {
  late Future<_BreakdownView> _load;

  @override
  void initState() {
    super.initState();
    _load = _loadBreakdown();
  }

  Future<_BreakdownView> _loadBreakdown() async {
    final parent = widget.parent;
    final payments = parent.id == null
        ? <ParentPaymentRecord>[]
        : await widget.schoolRepository.getParentPayments(parent.id!);
    final account = parent.virtualAccountNumber?.trim() ?? '';
    double? quasar;
    String? quasarError;
    if (account.isEmpty) {
      quasar = 0;
    } else {
      try {
        final rows = await sl<FinanceRepository>().getVirtualAccountTransactions(account);
        quasar = ParentCreditParts.quasarBalanceFromRows(rows);
        if (quasar == null) {
          quasarError = 'Quasar did not return a balance for $account.';
        }
      } catch (e) {
        quasarError = friendlyApiError(e, fallback: 'Could not read the Quasar balance.');
      }
    }

    if (quasar == null) {
      return _BreakdownView(
        payments: payments,
        parts: null,
        accountNumber: account,
        error: quasarError,
        saved: false,
      );
    }

    final parts = ParentCreditParts.fromPayments(
      quasarBalance: quasar,
      payments: payments,
    );
    var saved = false;
    if (parent.id != null && (parent.creditBalance - parts.recalculated).abs() > 0.009) {
      await widget.schoolRepository.updateParent(
        parent.copyWith(creditBalance: parts.recalculated),
      );
      saved = true;
    }
    return _BreakdownView(
      payments: payments,
      parts: parts,
      accountNumber: account,
      error: null,
      saved: saved,
    );
  }

  @override
  Widget build(BuildContext context) {
    final money = CurrencyFormatter.formatWithSymbol;
    return Scaffold(
      appBar: AppBar(title: const Text('Parent credit')),
      body: FutureBuilder<_BreakdownView>(
        future: _load,
        builder: (context, snap) {
          if (!snap.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final view = snap.data!;
          if (view.parts == null) {
            return Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(view.error ?? 'Quasar balance is unavailable.'),
                  const SizedBox(height: 12),
                  const Text(
                    'Parent credit was left unchanged.',
                    style: TextStyle(color: Colors.blueGrey),
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton(
                    onPressed: () => setState(() => _load = _loadBreakdown()),
                    child: const Text('Try again'),
                  ),
                ],
              ),
            );
          }
          final parts = view.parts!;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                'Recalculated credit',
                style: TextStyle(fontSize: 12, color: Colors.blueGrey.shade700),
              ),
              const SizedBox(height: 4),
              Text(
                money(parts.recalculated),
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
              ),
              if (view.saved)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    'Updated from ${money(widget.parent.creditBalance)}.',
                    style: TextStyle(color: Colors.green.shade700),
                  ),
                ),
              const SizedBox(height: 16),
              _amountCard(
                title: 'Quasar balance',
                subtitle: view.accountNumber.isEmpty
                    ? 'No parent virtual account'
                    : 'Parent virtual account ${view.accountNumber}',
                amount: money(parts.quasarBalance),
                color: Colors.indigo,
              ),
              const SizedBox(height: 8),
              Text(
                'This is the live balance on this parent’s virtual account only. Older virtual-account lines are not added again.',
                style: TextStyle(fontSize: 12, color: Colors.blueGrey.shade700),
              ),
              const SizedBox(height: 20),
              _paymentSection(
                title: 'Cash',
                total: parts.cash,
                payments: view.payments.where((p) => p.source == 'cash').toList(),
              ),
              const SizedBox(height: 16),
              _paymentSection(
                title: 'School account',
                total: parts.schoolAccount,
                payments: view.payments.where((p) => p.source == 'company_account').toList(),
              ),
              if (parts.card > 0.009) ...[
                const SizedBox(height: 16),
                _paymentSection(
                  title: 'Card',
                  total: parts.card,
                  payments: view.payments.where((p) => p.source == 'pos').toList(),
                ),
              ],
              if (parts.mappedToChildren > 0.009) ...[
                const SizedBox(height: 16),
                _amountCard(
                  title: 'Mapped to children',
                  subtitle: 'Already used from parent credit',
                  amount: '− ${money(parts.mappedToChildren)}',
                  color: Colors.red.shade700,
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  Widget _amountCard({
    required String title,
    required String subtitle,
    required String amount,
    required Color color,
  }) {
    return Card(
      child: ListTile(
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: Text(
          amount,
          style: TextStyle(fontWeight: FontWeight.w800, color: color),
        ),
      ),
    );
  }

  Widget _paymentSection({
    required String title,
    required double total,
    required List<ParentPaymentRecord> payments,
  }) {
    final money = CurrencyFormatter.formatWithSymbol;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Card(
          child: ListTile(
            title: Text('$title added to credit'),
            trailing: Text(
              money(total),
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
        ),
        if (payments.isEmpty)
          const Padding(
            padding: EdgeInsets.only(left: 4, top: 4),
            child: Text('None', style: TextStyle(color: Colors.blueGrey)),
          )
        else
          ...payments.map(
            (payment) => ListTile(
              dense: true,
              title: Text(money(payment.toCredit)),
              subtitle: Text(
                '${DateFormat('dd MMM yyyy HH:mm').format(payment.createdAt)}'
                ' · ${ParentPaymentReceiptService.methodLabel(payment.source)}'
                ' · ${payment.reference}',
              ),
            ),
          ),
      ],
    );
  }
}

class _BreakdownView {
  final List<ParentPaymentRecord> payments;
  final ParentCreditParts? parts;
  final String accountNumber;
  final String? error;
  final bool saved;

  const _BreakdownView({
    required this.payments,
    required this.parts,
    required this.accountNumber,
    required this.error,
    required this.saved,
  });
}
