import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/sync/domain/services/finance_command_lifecycle.dart';
import 'package:involve_app/core/utils/invoice_payment_legs.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/invoicing/domain/services/local_payment_apply.dart';

Invoice _invoice({
  required String method,
  required String status,
  required double total,
  required double paid,
  String businessMode = 'school',
  int? studentId = 1,
}) {
  return Invoice(
    invoiceNumber: 'INV-1',
    dateCreated: DateTime(2026, 10, 20),
    items: const [],
    subtotal: total,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: total,
    paymentStatus: status,
    amountPaid: paid,
    balanceAmount: total - paid,
    paymentMethod: method,
    businessMode: businessMode,
    studentId: studentId,
    syncId: 'sync-1',
  );
}

void main() {
  test('parent-wallet payment stays pending and does not increase confirmed paid', () {
    final plan = planRecordedPayment(
      invoice: _invoice(method: 'Cash', status: 'Unpaid', total: 10, paid: 0),
      additionalAmount: 10,
      method: 'Parent Credit',
      commandId: '11111111-1111-4111-8111-111111111111',
    );
    expect(plan.status, 'Pending');
    expect(plan.amountPaid, 0);
    expect(plan.reduceOpenBalances, isFalse);
    expect(plan.storedMethod, contains('cmd:11111111-1111-4111-8111-111111111111'));
    final pending = Invoice(
      invoiceNumber: 'INV-1',
      dateCreated: DateTime(2026, 10, 20),
      items: const [],
      subtotal: 10,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 10,
      paymentStatus: plan.status,
      amountPaid: plan.amountPaid,
      balanceAmount: plan.balance,
      paymentMethod: plan.storedMethod,
    );
    expect(pending.collectedAmount, 0);
    expect(pending.displayPaymentStatus, 'Submitted');
  });

  test('Wallet+school uses the same pending projection', () {
    final plan = planRecordedPayment(
      invoice: _invoice(method: '', status: 'Unpaid', total: 8, paid: 0),
      additionalAmount: 8,
      method: 'Wallet',
      commandId: '22222222-2222-4222-8222-222222222222',
    );
    expect(plan.status, 'Pending');
    expect(plan.amountPaid, 0);
    expect(plan.reduceOpenBalances, isFalse);
  });

  test('cash and POS still confirm locally', () {
    for (final method in ['Cash', 'POS']) {
      final plan = planRecordedPayment(
        invoice: _invoice(method: '', status: 'Unpaid', total: 5, paid: 0),
        additionalAmount: 5,
        method: method,
        commandId: '33333333-3333-4333-8333-333333333333',
      );
      expect(plan.status, 'Paid');
      expect(plan.amountPaid, 5);
      expect(plan.reduceOpenBalances, isTrue);
    }
  });

  test('retry of the same command id does not add a second leg', () {
    final first = planRecordedPayment(
      invoice: _invoice(method: '', status: 'Unpaid', total: 6, paid: 0),
      additionalAmount: 6,
      method: 'Parent Credit',
      commandId: '44444444-4444-4444-8444-444444444444',
    );
    final pending = _invoice(
      method: first.storedMethod,
      status: first.status,
      total: 6,
      paid: first.amountPaid,
    );
    final retry = planRecordedPayment(
      invoice: pending,
      additionalAmount: 6,
      method: 'Parent Credit',
      commandId: '44444444-4444-4444-8444-444444444444',
    );
    expect(retry.alreadyApplied, isTrue);
    expect(displayPaymentLegs(pending), hasLength(1));
  });

  test('two legitimate payments keep distinct command identities', () {
    const firstId = '55555555-5555-4555-8555-555555555555';
    const secondId = '66666666-6666-4666-8666-666666666666';
    final first = planRecordedPayment(
      invoice: _invoice(method: 'Cash', status: 'Paid', total: 20, paid: 10)
          .copyWith(
        paymentMethod: encodePaymentLegs(const [
          InvoicePaymentLeg(amount: 10, method: 'Cash'),
        ]),
        paymentStatus: 'Partial',
      ),
      additionalAmount: 4,
      method: 'Parent Credit',
      commandId: firstId,
    );
    final afterFirst = _invoice(
      method: first.storedMethod,
      status: first.status,
      total: 20,
      paid: first.amountPaid,
    );
    final second = planRecordedPayment(
      invoice: afterFirst,
      additionalAmount: 4,
      method: 'Parent Credit',
      commandId: secondId,
    );
    expect(first.alreadyApplied, isFalse);
    expect(second.alreadyApplied, isFalse);
    expect(second.storedMethod, contains(firstId));
    expect(second.storedMethod, contains(secondId));
  });

  test('pending and reconciliation-required amounts are excluded from confirmed totals', () {
    expect(
      confirmedCollectedTotal([
        _invoice(method: 'Parent Credit', status: 'Pending', total: 10, paid: 10)
            .collectedAmount,
        _invoice(method: 'Cash', status: 'Paid', total: 3, paid: 3).collectedAmount,
      ]),
      3,
    );
    expect(financeCommandUiLabel(FinanceCommandLifecycle.pending), 'Submitted');
    expect(financeCommandUiLabel(FinanceCommandLifecycle.accepted), 'Paid');
    expect(financeAckConfirmsLocally(FinanceCommandLifecycle.duplicate), isTrue);
    expect(financeAckConfirmsLocally(FinanceCommandLifecycle.rejected), isFalse);
    expect(
      financeAckConfirmsLocally(FinanceCommandLifecycle.reconciliationRequired),
      isFalse,
    );
  });
}
