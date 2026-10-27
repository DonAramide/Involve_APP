import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/school/domain/services/parent_transaction_history.dart';

Invoice _bill({
  required String number,
  required double total,
  required double paid,
  int? studentId,
  DateTime? at,
}) {
  return Invoice(
    invoiceNumber: number,
    dateCreated: at ?? DateTime(2026, 10, 7),
    items: const [],
    subtotal: total,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: total,
    paymentStatus: paid >= total ? 'Paid' : 'Partial',
    amountPaid: paid,
    balanceAmount: total - paid,
    studentId: studentId,
    paymentMethod: 'Cash',
  );
}

void main() {
  test('merges parent payments and paid bills, skips slips and unpaid', () {
    final rows = buildParentTransactions(
      payments: [
        ParentPaymentRecord(
          parentId: 1,
          reference: 'VA-1',
          amount: 200,
          source: 'va_deposit',
          createdAt: DateTime(2026, 10, 7, 0, 15),
        ),
      ],
      invoices: [
        _bill(number: 'INV-1', total: 150, paid: 150, studentId: 9),
        _bill(number: 'INV-2', total: 80, paid: 0),
        _bill(number: 'PMT-9', total: 200, paid: 200),
      ],
    );
    expect(rows.length, 2);
    expect(rows.first.kind, ParentTxnKind.parentPayment);
    expect(rows.last.kind, ParentTxnKind.paidBill);
    expect(rows.last.reference, 'INV-1');
  });

  test('filters by kind, child, and search', () {
    final rows = buildParentTransactions(
      payments: [
        ParentPaymentRecord(
          parentId: 1,
          reference: 'VA-1',
          amount: 200,
          source: 'va_deposit',
          createdAt: DateTime(2026, 10, 7),
          allocations: const [
            ParentPaymentAllocationRecord(
              studentId: 9,
              outstandingBefore: 200,
              allocated: 200,
              outstandingAfter: 0,
            ),
          ],
        ),
      ],
      invoices: [
        _bill(number: 'INV-1', total: 150, paid: 150, studentId: 9),
        _bill(number: 'INV-2', total: 50, paid: 50, studentId: 10),
      ],
    );
    final billsOnly = filterParentTransactions(
      rows,
      const ParentTxnQuery(kind: ParentTxnKindFilter.paidBills),
    );
    expect(billsOnly.length, 2);
    final child9 = filterParentTransactions(
      rows,
      const ParentTxnQuery(studentId: 9),
    );
    expect(child9.length, 2);
    final search = filterParentTransactions(
      rows,
      const ParentTxnQuery(search: 'va-1'),
    );
    expect(search.single.reference, 'VA-1');
  });
}
