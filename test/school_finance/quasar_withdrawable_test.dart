import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/school_finance/domain/services/quasar_withdrawable.dart';

Invoice _bill({
  required String number,
  required String method,
  required double paid,
  required DateTime at,
  String status = 'Paid',
}) {
  return Invoice(
    invoiceNumber: number,
    dateCreated: at,
    items: const [],
    subtotal: paid,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: paid,
    paymentStatus: status,
    amountPaid: paid,
    paymentMethod: method,
  );
}

ParentPaymentRecord _credit({
  required String source,
  required double toCredit,
  required DateTime at,
  double appliedToDebt = 0,
}) {
  return ParentPaymentRecord(
    parentId: 1,
    reference: source,
    amount: toCredit + appliedToDebt,
    toCredit: toCredit,
    appliedToDebt: appliedToDebt,
    source: source,
    createdAt: at,
  );
}

void main() {
  test('parent wallet used on a bill is school-wallet money', () {
    final amount = QuasarWithdrawable.calculate(
      payments: [
        _credit(source: 'va_deposit', toCredit: 200, at: DateTime(2026, 10, 4, 23, 48)),
        _credit(source: 'cash', toCredit: 2, at: DateTime(2026, 10, 4, 23, 50)),
      ],
      invoices: [
        _bill(
          number: 'INV-OLD',
          method: 'Wallet',
          paid: 6.90,
          at: DateTime(2026, 8, 29),
        ),
        _bill(
          number: 'INV-20261005-021522',
          method: 'Wallet',
          paid: 69,
          at: DateTime(2026, 10, 5, 2, 15),
        ),
      ],
    );

    expect(amount, 75.9);
  });

  test('a parent-wallet bill is withdrawable for the full amount', () {
    final amount = QuasarWithdrawable.calculate(
      payments: [
        _credit(source: 'va_deposit', toCredit: 50, at: DateTime(2026, 10, 1)),
        _credit(source: 'pos', toCredit: 10, at: DateTime(2026, 10, 2)),
        _credit(source: 'cash', toCredit: 20, at: DateTime(2026, 10, 3)),
      ],
      invoices: [
        _bill(
          number: 'INV-MIX',
          method: 'Wallet',
          paid: 70,
          at: DateTime(2026, 10, 4),
        ),
      ],
    );

    expect(amount, 70);
  });

  test('appliedToDebt is not added on top of a parent-wallet bill', () {
    final amount = QuasarWithdrawable.calculate(
      payments: [
        _credit(
          source: 'va_deposit',
          toCredit: 0,
          appliedToDebt: 6,
          at: DateTime(2026, 10, 5),
        ),
      ],
      invoices: [
        _bill(
          number: 'INV-WALLET',
          method: 'Wallet',
          paid: 6,
          at: DateTime(2026, 10, 5, 1),
        ),
      ],
    );

    expect(amount, 6);
  });

  test('pending virtual account and cash bills stay out', () {
    final amount = QuasarWithdrawable.calculate(
      payments: const [],
      invoices: [
        _bill(
          number: 'INV-VA',
          method: 'VirtualAccount',
          paid: 28.75,
          at: DateTime(2026, 10, 5, 1, 39),
          status: 'Pending',
        ),
        _bill(
          number: 'INV-CASH',
          method: 'Cash',
          paid: 10,
          at: DateTime(2026, 10, 5),
        ),
        _bill(
          number: 'INV-CARD',
          method: 'POS',
          paid: 15,
          at: DateTime(2026, 10, 5, 3),
        ),
      ],
    );

    expect(amount, 15);
  });

  test('card, VA bills, and wallet funded by VA leftover are all settleable', () {
    final amount = QuasarWithdrawable.calculate(
      payments: [
        _credit(
          source: 'va_deposit',
          toCredit: 75.61,
          at: DateTime(2026, 10, 7, 1),
        ),
      ],
      invoices: [
        _bill(
          number: 'INV-CARD',
          method: 'POS',
          paid: 12.51,
          at: DateTime(2026, 10, 7, 1, 10),
        ),
        _bill(
          number: 'INV-VA',
          method: 'VirtualAccount',
          paid: 40.25,
          at: DateTime(2026, 10, 7, 1, 20),
        ),
        _bill(
          number: 'INV-WALLET',
          method: 'Wallet',
          paid: 75.61,
          at: DateTime(2026, 10, 7, 2),
        ),
      ],
    );

    expect(amount, 128.37);
    final origin = QuasarWithdrawable.originRailByInvoiceNumber(
      invoices: [
        _bill(
          number: 'INV-WALLET',
          method: 'Wallet',
          paid: 75.61,
          at: DateTime(2026, 10, 7, 2),
        ),
      ],
      payments: [
        _credit(
          source: 'va_deposit',
          toCredit: 75.61,
          at: DateTime(2026, 10, 7, 1),
        ),
      ],
    );
    expect(origin['INV-WALLET'], 'wallet');
  });
}
