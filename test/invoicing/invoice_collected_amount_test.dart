import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';

Invoice _invoice({
  required String status,
  required double total,
  required double paid,
}) {
  return Invoice(
    invoiceNumber: 'INV-1',
    dateCreated: DateTime(2026, 9, 8),
    items: const [],
    subtotal: total,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: total,
    paymentStatus: status,
    amountPaid: paid,
    balanceAmount: total - paid,
  );
}

void main() {
  group('Invoice collected vs outstanding', () {
    test('pending checkout is not collected even when amountPaid equals total', () {
      final inv = _invoice(status: 'Pending', total: 1.15, paid: 1.15);
      expect(inv.collectedAmount, 0);
      expect(inv.outstandingAmount, 1.15);
    });

    test('paid invoices count as collected', () {
      final inv = _invoice(status: 'Paid', total: 2.47, paid: 2.47);
      expect(inv.collectedAmount, 2.47);
      expect(inv.outstandingAmount, 0);
    });

    test('partial invoices collect only the paid portion', () {
      final inv = _invoice(status: 'Partial', total: 10, paid: 4);
      expect(inv.collectedAmount, 4);
      expect(inv.outstandingAmount, 6);
    });
  });
}
