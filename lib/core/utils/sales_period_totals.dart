import '../../features/invoicing/domain/entities/invoice.dart';
import 'invoice_payment_legs.dart';
import 'invoice_payment_rail.dart';

class SalesPeriodTotals {
  const SalesPeriodTotals({
    required this.invoiced,
    required this.collected,
    required this.pending,
  });

  final double invoiced;
  final double collected;
  final double pending;
}

/// Header totals for a sales period. Skips payment slips, credits, and
/// negative rows. Collected plus pending equals invoiced.
/// A rolled-forward bill is omitted because that debt now sits on the later invoice.
SalesPeriodTotals salesPeriodTotals(Iterable<Invoice> invoices) {
  var invoiced = 0.0;
  var collected = 0.0;
  var pending = 0.0;
  for (final inv in invoices) {
    if (!inv.countsTowardSales || inv.isRolledForward) continue;
    final billed = inv.totalAmount < 0 ? 0.0 : inv.totalAmount;
    final got = inv.collectedAmount > billed ? billed : inv.collectedAmount;
    invoiced += billed;
    collected += got;
    pending += billed - got;
  }
  return SalesPeriodTotals(
    invoiced: invoiced,
    collected: collected,
    pending: pending,
  );
}

class SalesRailTotals {
  const SalesRailTotals({
    required this.card,
    required this.transfer,
    required this.vaTransfer,
    required this.cash,
    required this.wallet,
  });

  final double card;
  final double transfer;
  final double vaTransfer;
  final double cash;
  final double wallet;

  double get sum => card + transfer + vaTransfer + cash + wallet;
}

/// Card, transfer, VA, cash, and wallet for the same bills as [salesPeriodTotals].
/// Leg amounts cannot exceed the invoice collected total.
SalesRailTotals salesRailTotals(
  Iterable<Invoice> invoices, {
  Map<String, String> originRails = const {},
}) {
  var card = 0.0;
  var transfer = 0.0;
  var vaTransfer = 0.0;
  var cash = 0.0;
  var wallet = 0.0;
  for (final inv in invoices) {
    if (!inv.countsTowardSales || inv.isRolledForward) continue;
    final legs = confirmedPaymentLegs(inv);
    var remaining = inv.collectedAmount;
    for (final leg in legs) {
      if (remaining <= 0.001) break;
      final amount = leg.amount > remaining ? remaining : leg.amount;
      if (amount <= 0) continue;
      remaining -= amount;
      switch (classifySalesRail(
        leg.method,
        originRail: legs.length == 1 ? originRails[inv.invoiceNumber] : null,
      )) {
        case InvoicePaymentRail.card:
          card += amount;
          break;
        case InvoicePaymentRail.vaTransfer:
          vaTransfer += amount;
          break;
        case InvoicePaymentRail.bankTransfer:
          transfer += amount;
          break;
        case InvoicePaymentRail.cash:
          cash += amount;
          break;
        case InvoicePaymentRail.wallet:
          wallet += amount;
          break;
        case InvoicePaymentRail.other:
          break;
      }
    }
  }
  return SalesRailTotals(
    card: card,
    transfer: transfer,
    vaTransfer: vaTransfer,
    cash: cash,
    wallet: wallet,
  );
}
