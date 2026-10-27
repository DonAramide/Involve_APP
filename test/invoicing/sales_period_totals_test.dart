import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/utils/sales_period_totals.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';

Invoice _row({
  required String number,
  required double total,
  required double paid,
  double? balance,
  String status = 'Paid',
  String? method,
}) {
  return Invoice(
    invoiceNumber: number,
    dateCreated: DateTime(2026, 10, 7),
    items: const [],
    subtotal: total,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: total,
    paymentStatus: status,
    amountPaid: paid,
    balanceAmount: balance ?? (total - paid),
    paymentMethod: method,
  );
}

void main() {
  test('sales totals skip payment slips and negative rows', () {
    final totals = salesPeriodTotals([
      _row(number: 'INV-1', total: 100, paid: 100),
      _row(number: 'INV-2', total: 74.75, paid: 0, status: 'Unpaid'),
      _row(number: 'PMT-9', total: -900, paid: -900),
      _row(number: 'INV-RET', total: -80, paid: -80),
      _row(number: 'INV-3', total: 40.25, paid: 40.25),
    ]);
    expect(totals.invoiced, 215.00);
    expect(totals.collected, 140.25);
    expect(totals.pending, 74.75);
  });

  test('new cash on a carry-forward invoice does not collect the rolled old bill', () {
    final totals = salesPeriodTotals([
      _row(number: 'INV-OLD', total: 7, paid: 0, balance: 0, status: 'Rolled Forward'),
      _row(number: 'INV-NEW', total: 11, paid: 6, balance: 5, status: 'Partial'),
      _row(number: 'INV-CASH', total: 8, paid: 8),
      _row(number: 'INV-TF', total: 20, paid: 20, status: 'Pending'),
      _row(number: 'INV-WALLET', total: 4, paid: 4),
    ]);
    expect(totals.invoiced, 43.00);
    expect(totals.collected, 18.00);
    expect(totals.pending, 25.00);
    expect(totals.collected + totals.pending, totals.invoiced);
  });

  test('collected plus pending equals invoiced', () {
    final totals = salesPeriodTotals([
      _row(number: 'INV-CASH', total: 29, paid: 29),
      _row(number: 'INV-TF', total: 20, paid: 20),
      _row(number: 'INV-DUE', total: 22, paid: 0, status: 'Unpaid'),
      _row(number: 'INV-OLD', total: 5, paid: 0, balance: 0, status: 'Rolled Forward'),
    ]);
    expect(totals.invoiced, 71);
    expect(totals.collected, 49);
    expect(totals.pending, 22);
    expect(totals.collected + totals.pending, totals.invoiced);
  });

  test('pay later is pending and is not collected', () {
    final totals = salesPeriodTotals([
      _row(number: 'INV-CASH', total: 2, paid: 2, method: 'Cash'),
      _row(number: 'INV-LATER', total: 6, paid: 2, status: 'Partial', method: 'Deferred'),
      _row(number: 'INV-TF', total: 12, paid: 12, status: 'Pending', method: 'Transfer'),
      _row(number: 'INV-TF2', total: 2, paid: 2, status: 'Pending', method: 'Transfer'),
    ]);
    expect(totals.invoiced, 22);
    expect(totals.collected, 2);
    expect(totals.pending, 20);
  });

  test('transfer plus cash matches collected and skips rolled-forward cash', () {
    final invoices = [
      _row(number: 'INV-OLD', total: 6, paid: 6, status: 'Rolled Forward'),
      _row(number: 'INV-CASH', total: 23, paid: 23, method: 'Cash'),
      _row(number: 'INV-TF', total: 20, paid: 20, method: 'Transfer'),
    ];
    final totals = salesPeriodTotals(invoices);
    final rails = salesRailTotals(invoices);
    expect(totals.collected, 43);
    expect(rails.transfer, 20);
    expect(rails.cash, 23);
    expect(rails.sum, totals.collected);
  });
}
