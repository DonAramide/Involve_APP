import 'package:involve_app/core/utils/invoice_payment_rail.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';

/// Money Quasar can settle to the tenant bank.
///
/// Counts card payments and virtual-account money only after it has been used
/// on a bill. Cash and the school account stay out, including when they sit
/// in the same parent credit as a virtual-account top-up.
class QuasarWithdrawable {
  static double calculate({
    required List<Invoice> invoices,
    required List<ParentPaymentRecord> payments,
  }) {
    return _round(lines(invoices: invoices, payments: payments)
        .fold<double>(0, (sum, line) => sum + line.amount));
  }

  /// Settleable slices already used on a bill. Cash is omitted.
  static List<QuasarSettlementLine> lines({
    required List<Invoice> invoices,
    required List<ParentPaymentRecord> payments,
  }) {
    final steps = <_Step>[];
    final arrived = <QuasarSettlementLine>[];

    for (final payment in payments) {
      final bucket = _bucket(payment.source);
      // appliedToDebt is not a second allocation. The invoice leg is the only
      // withdrawal identity for money already used on a bill.
      if (payment.toCredit > 0.001 && bucket != _Bucket.other) {
        steps.add(_Step(
          at: payment.createdAt,
          kind: _Kind.inflow,
          bucket: bucket,
          amount: payment.toCredit,
        ));
      }
    }

    for (final invoice in invoices) {
      if (invoice.invoiceNumber.startsWith('PMT-')) continue;
      if (invoice.isPendingPayment) continue;
      final collected = invoice.collectedAmount;
      if (collected <= 0.001) continue;
      final rail = classifyInvoicePaymentRail(invoice.paymentMethod);
      if (rail == InvoicePaymentRail.card) {
        steps.add(_Step(
          at: invoice.dateCreated,
          kind: _Kind.cardBill,
          amount: collected,
          reference: invoice.invoiceNumber,
        ));
      } else if (rail == InvoicePaymentRail.vaTransfer) {
        steps.add(_Step(
          at: invoice.dateCreated,
          kind: _Kind.vaBill,
          amount: collected,
          reference: invoice.invoiceNumber,
        ));
      } else if (_drawsParentCredit(invoice.paymentMethod)) {
        steps.add(_Step(
          at: invoice.dateCreated,
          kind: _Kind.creditSpend,
          amount: collected,
          reference: invoice.invoiceNumber,
        ));
      }
    }

    steps.sort((a, b) {
      final byTime = a.at.compareTo(b.at);
      if (byTime != 0) return byTime;
      return a.kind.index.compareTo(b.kind.index);
    });

    final result = <QuasarSettlementLine>[...arrived];

    for (final step in steps) {
      if (step.kind == _Kind.inflow) continue;
      if (step.kind == _Kind.cardBill || step.kind == _Kind.vaBill) {
        result.add(QuasarSettlementLine(
          reference: step.reference,
          amount: _round(step.amount),
          rail: step.kind == _Kind.cardBill ? 'card' : 'va',
          at: step.at,
        ));
        continue;
      }
      // Parent wallet used on a bill credits the school wallet in full.
      // Charges are taken from that outgoing wallet, not from the parent's VA.
      result.add(QuasarSettlementLine(
        reference: step.reference,
        amount: _round(step.amount),
        rail: 'wallet',
        at: step.at,
      ));
    }

    return result.where((line) => line.amount > 0.001 && line.reference.isNotEmpty).toList();
  }

  /// Invoice number → va | card for billed Quasar origin (parent credit included).
  static Map<String, String> originRailByInvoiceNumber({
    required List<Invoice> invoices,
    required List<ParentPaymentRecord> payments,
  }) {
    final map = <String, String>{};
    for (final line in lines(invoices: invoices, payments: payments)) {
      map[line.reference] = line.rail;
    }
    return map;
  }

  static bool _drawsParentCredit(String? method) {
    final rail = classifyInvoicePaymentRail(method);
    if (rail == InvoicePaymentRail.cash) return false;
    if (rail == InvoicePaymentRail.wallet) return true;
    final normalized = (method ?? '')
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'[\s-]+'), '_');
    return normalized == 'parent_credit' || normalized.contains('parent_credit');
  }

  static _Bucket _bucket(String source) {
    final normalized = source.trim().toLowerCase().replaceAll(RegExp(r'[\s-]+'), '_');
    if (normalized == 'va_deposit' ||
        normalized == 'parent_account' ||
        normalized == 'virtual_account' ||
        normalized == 'virtualaccount' ||
        normalized == 'parent_transfer') {
      return _Bucket.va;
    }
    if (normalized == 'pos' || normalized == 'card') return _Bucket.card;
    if (normalized == 'cash') return _Bucket.cash;
    return _Bucket.other;
  }

  static double _round(double value) => (value * 100).round() / 100.0;
}

enum _Bucket { va, card, cash, other }

enum _Kind { inflow, cardBill, vaBill, creditSpend }

class _Step {
  final DateTime at;
  final _Kind kind;
  final _Bucket bucket;
  final double amount;
  final String reference;

  const _Step({
    required this.at,
    required this.kind,
    this.bucket = _Bucket.other,
    required this.amount,
    this.reference = '',
  });
}

class QuasarSettlementLine {
  final String reference;
  final double amount;
  final String rail;
  final DateTime at;

  const QuasarSettlementLine({
    required this.reference,
    required this.amount,
    required this.rail,
    required this.at,
  });
}
