import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/utils/student_invoice_settlement.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';

Invoice _invoice({
  required String status,
  required double total,
  required double paid,
  int? studentId,
  String number = 'INV-1',
}) {
  return Invoice(
    invoiceNumber: number,
    dateCreated: DateTime(2026, 9, 8),
    items: const [],
    subtotal: total,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: total,
    paymentStatus: status,
    amountPaid: paid,
    balanceAmount: total - paid,
    studentId: studentId,
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

    test('rolled-forward prior bill is not new cash collected', () {
      final inv = Invoice(
        invoiceNumber: 'INV-OLD',
        dateCreated: DateTime(2026, 9, 1),
        items: const [],
        subtotal: 7,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 7,
        paymentStatus: 'Rolled Forward',
        amountPaid: 0,
        balanceAmount: 0,
      );
      expect(inv.collectedAmount, 0);
      expect(inv.outstandingAmount, 0);
      expect(inv.displayPaymentStatus, 'Rolled Forward');
    });
  });

  test('pending transfer student is owing, not fully paid', () {
    final invoices = [
      _invoice(status: 'Paid', total: 3, paid: 3, studentId: 1, number: 'INV-1'),
      _invoice(status: 'Pending', total: 4, paid: 4, studentId: 2, number: 'INV-2'),
      _invoice(status: 'Unpaid', total: 5, paid: 0, studentId: 3, number: 'INV-3'),
    ];
    expect(openAcademicDebt(invoices), 9);
    final counts = countStudentPayStatus(studentIds: [1, 2, 3], invoices: invoices);
    expect(counts.paid, 1);
    expect(counts.owing, 2);
    expect(counts.owingValue, 9);
  });
}
