import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/school/domain/services/parent_credit_breakdown.dart';

ParentPaymentRecord _payment({
  required String source,
  required double amount,
  double toCredit = 0,
}) {
  return ParentPaymentRecord(
    parentId: 1,
    reference: source,
    amount: amount,
    toCredit: toCredit,
    source: source,
    createdAt: DateTime(2026, 10, 4),
  );
}

void main() {
  test('credit is Quasar plus cash and school account, not virtual-account history', () {
    final parts = ParentCreditParts.fromPayments(
      quasarBalance: 38.50,
      payments: [
        _payment(source: 'va_deposit', amount: 15, toCredit: 15),
        _payment(source: 'va_deposit', amount: 15, toCredit: 15),
        _payment(source: 'cash', amount: 10, toCredit: 10),
        _payment(source: 'company_account', amount: 4, toCredit: 4),
      ],
    );

    expect(parts.quasarBalance, 38.50);
    expect(parts.cash, 10);
    expect(parts.schoolAccount, 4);
    expect(parts.recalculated, 52.50);
  });

  test('money already mapped to children is taken off the recalculated credit', () {
    final parts = ParentCreditParts.fromPayments(
      quasarBalance: 38.50,
      payments: [
        _payment(source: 'cash', amount: 10, toCredit: 10),
        _payment(source: 'credit_map', amount: 6),
      ],
    );

    expect(parts.mappedToChildren, 6);
    expect(parts.recalculated, 42.50);
  });

  test('Quasar balance is read only from liveBalance on the parent account rows', () {
    expect(
      ParentCreditParts.quasarBalanceFromRows([
        {
          'reference': 'qfs:900:reconcile:50',
          'amount': 50,
          'metadata': {'liveBalance': 38.5},
        },
      ]),
      38.50,
    );
    expect(ParentCreditParts.quasarBalanceFromRows(const []), isNull);
  });
}
