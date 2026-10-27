import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/core/utils/invoice_payment_rail.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';

class InvoicePaymentLeg {
  const InvoicePaymentLeg({
    required this.amount,
    required this.method,
    this.confirmed = true,
    this.receivedAt,
    this.commandId,
  });

  final double amount;
  final String method;
  final bool confirmed;
  final DateTime? receivedAt;
  final String? commandId;
}

/// Confirmed money on an invoice, one entry per method.
/// A plain method such as Cash is one leg. `split|4.00|Cash|1|3.00|Transfer|0`
/// keeps a later partial on its own method. Pending invoices contribute nothing
/// until the transfer or cash is confirmed.
List<InvoicePaymentLeg> confirmedPaymentLegs(Invoice invoice) {
  if (invoice.isPendingPayment || invoice.collectedAmount <= 0) return const [];
  final parsed = _parseSplit(invoice.paymentMethod);
  if (parsed.isNotEmpty) {
    return parsed
        .where((leg) =>
            leg.confirmed &&
            leg.amount > 0 &&
            !isPayLaterPaymentMethod(leg.method))
        .toList();
  }
  final method = (invoice.paymentMethod ?? '').trim();
  if (method.isEmpty || isPayLaterPaymentMethod(method)) return const [];
  return [
    InvoicePaymentLeg(amount: invoice.collectedAmount, method: method),
  ];
}

/// Every recorded slice, including an unconfirmed company transfer.
List<InvoicePaymentLeg> displayPaymentLegs(Invoice invoice) {
  final parsed = _parseSplit(invoice.paymentMethod);
  if (parsed.isNotEmpty) return parsed;
  final method = (invoice.paymentMethod ?? '').trim();
  if (method.isEmpty || invoice.amountPaid <= 0) return const [];
  return [
    InvoicePaymentLeg(
      amount: invoice.amountPaid,
      method: method,
      confirmed: !invoice.isPendingPayment,
    ),
  ];
}

String encodePaymentLegs(List<InvoicePaymentLeg> legs) {
  final kept = legs.where((leg) => leg.amount > 0.001).toList();
  if (kept.isEmpty) return '';
  if (kept.length == 1 &&
      kept.first.confirmed &&
      kept.first.receivedAt == null &&
      (kept.first.commandId == null || kept.first.commandId!.isEmpty)) {
    return kept.first.method;
  }
  return 'split|${kept.map(_encodeLeg).join('|')}';
}

String _encodeLeg(InvoicePaymentLeg leg) {
  final base =
      '${leg.amount.toStringAsFixed(2)}|${leg.method}|${leg.confirmed ? 1 : 0}';
  final at = leg.receivedAt;
  final withTime = at == null ? base : '$base|${at.toIso8601String()}';
  final commandId = (leg.commandId ?? '').trim();
  if (commandId.isEmpty) return withTime;
  return '$withTime|cmd:$commandId';
}

bool isAwaitingCompanyBankTransferLeg(InvoicePaymentLeg leg) {
  return !leg.confirmed &&
      classifyInvoicePaymentRail(leg.method) == InvoicePaymentRail.bankTransfer;
}

bool hasAwaitingCompanyBankTransfer(Invoice invoice) {
  return displayPaymentLegs(invoice).any(isAwaitingCompanyBankTransferLeg);
}

double awaitingCompanyBankTransferAmount(Invoice invoice) {
  return displayPaymentLegs(invoice)
      .where(isAwaitingCompanyBankTransferLeg)
      .fold(0.0, (sum, leg) => sum + leg.amount);
}

/// Confirms company-bank legs that were waiting. Cash / VA / wallet legs stay as-is.
Invoice confirmCompanyBankTransferLegs(Invoice invoice) {
  final legs = displayPaymentLegs(invoice);
  if (legs.isEmpty) {
    final method = (invoice.paymentMethod ?? '').trim();
    if (classifyInvoicePaymentRail(method) != InvoicePaymentRail.bankTransfer) {
      return invoice;
    }
    final paid = CurrencyFormatter.roundMoney(
      invoice.amountPaid > 0.001 ? invoice.amountPaid : invoice.totalAmount,
    );
    final balance = CurrencyFormatter.roundMoney(
      (invoice.totalAmount - paid).clamp(0.0, double.infinity),
    );
    return invoice.copyWith(
      paymentStatus: balance <= 0.001 ? 'Paid' : 'Partial',
      amountPaid: paid,
      balanceAmount: balance,
      paymentMethod: 'Transfer',
    );
  }

  final next = <InvoicePaymentLeg>[];
  for (final leg in legs) {
    if (isAwaitingCompanyBankTransferLeg(leg)) {
      next.add(InvoicePaymentLeg(
        amount: leg.amount,
        method: leg.method,
        confirmed: true,
        receivedAt: leg.receivedAt,
        commandId: leg.commandId,
      ));
    } else {
      next.add(leg);
    }
  }
  final paid = CurrencyFormatter.roundMoney(
    next.where((leg) => leg.confirmed).fold(0.0, (sum, leg) => sum + leg.amount),
  );
  final balance = CurrencyFormatter.roundMoney(
    (invoice.totalAmount - paid).clamp(0.0, double.infinity),
  );
  return invoice.copyWith(
    paymentStatus: balance <= 0.001 ? 'Paid' : (paid > 0.001 ? 'Partial' : 'Unpaid'),
    amountPaid: paid,
    balanceAmount: balance,
    paymentMethod: encodePaymentLegs(next),
  );
}

List<InvoicePaymentLeg> _parseSplit(String? raw) {
  final value = (raw ?? '').trim();
  if (!value.startsWith('split|')) return const [];
  final parts = value.split('|').skip(1).toList();
  final legs = <InvoicePaymentLeg>[];
  var i = 0;
  while (i + 2 < parts.length) {
    final amount = double.tryParse(parts[i]) ?? 0;
    final method = parts[i + 1];
    final confirmed = parts[i + 2] != '0';
    i += 3;
    DateTime? receivedAt;
    if (i < parts.length) {
      receivedAt = DateTime.tryParse(parts[i]);
      if (receivedAt != null) i += 1;
    }
    String? commandId;
    if (i < parts.length && parts[i].startsWith('cmd:')) {
      commandId = parts[i].substring(4);
      i += 1;
    }
    if (amount <= 0) continue;
    legs.add(InvoicePaymentLeg(
      amount: amount,
      method: method,
      confirmed: confirmed,
      receivedAt: receivedAt,
      commandId: commandId,
    ));
  }
  return legs;
}
