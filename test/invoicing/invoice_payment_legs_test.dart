import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/utils/invoice_payment_legs.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';

Invoice _invoice({
  required String method,
  required String status,
  required double total,
  required double paid,
}) {
  return Invoice(
    invoiceNumber: 'INV-1',
    dateCreated: DateTime(2026, 10, 8),
    items: const [],
    subtotal: total,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: total,
    paymentStatus: status,
    amountPaid: paid,
    balanceAmount: total - paid,
    paymentMethod: method,
  );
}

void main() {
  test('deferred partial is not a confirmed cash or transfer leg', () {
    final legs = confirmedPaymentLegs(
      _invoice(method: 'Deferred', status: 'Partial', total: 7, paid: 4),
    );
    expect(legs, isEmpty);
  });

  test('split keeps cash and transfer partials apart', () {
    final encoded = encodePaymentLegs(const [
      InvoicePaymentLeg(amount: 4, method: 'Cash'),
      InvoicePaymentLeg(amount: 3, method: 'Transfer', confirmed: false),
    ]);
    final invoice = _invoice(method: encoded, status: 'Partial', total: 7, paid: 4);
    final confirmed = confirmedPaymentLegs(invoice);
    expect(confirmed.single.method, 'Cash');
    expect(confirmed.single.amount, 4);
    expect(displayPaymentLegs(invoice), hasLength(2));
  });

  test('split keeps the time a partial was received', () {
    final when = DateTime(2026, 10, 8, 12, 52, 48);
    final encoded = encodePaymentLegs([
      InvoicePaymentLeg(amount: 2, method: 'Cash', receivedAt: when),
      InvoicePaymentLeg(amount: 6, method: 'Cash', receivedAt: when.add(const Duration(hours: 1))),
    ]);
    final legs = displayPaymentLegs(
      _invoice(method: encoded, status: 'Paid', total: 8, paid: 8),
    );
    expect(legs.first.receivedAt, when);
    expect(legs.last.receivedAt, when.add(const Duration(hours: 1)));
  });

  test('cash plus awaiting company transfer can be confirmed without dropping cash', () {
    final encoded = encodePaymentLegs(const [
      InvoicePaymentLeg(amount: 3, method: 'Cash'),
      InvoicePaymentLeg(amount: 2, method: 'Transfer', confirmed: false),
    ]);
    final invoice = _invoice(
      method: encoded,
      status: 'Partial',
      total: 8,
      paid: 3,
    );
    expect(hasAwaitingCompanyBankTransfer(invoice), isTrue);
    expect(awaitingCompanyBankTransferAmount(invoice), 2);
    final confirmed = confirmCompanyBankTransferLegs(invoice);
    expect(confirmed.amountPaid, 5);
    expect(confirmed.balanceAmount, 3);
    expect(confirmed.paymentStatus, 'Partial');
    expect(confirmedPaymentLegs(confirmed).map((leg) => leg.method), ['Cash', 'Transfer']);
    expect(hasAwaitingCompanyBankTransfer(confirmed), isFalse);
  });

  test('pending transfer is not collected until confirmed', () {
    expect(
      confirmedPaymentLegs(
        _invoice(method: 'Transfer', status: 'Pending', total: 7, paid: 7),
      ),
      isEmpty,
    );
  });

  test('command identity round-trips on an unconfirmed parent-wallet leg', () {
    const commandId = '99999999-9999-4999-8999-999999999999';
    final encoded = encodePaymentLegs([
      InvoicePaymentLeg(
        amount: 5,
        method: 'Parent Credit',
        confirmed: false,
        receivedAt: DateTime(2026, 10, 20),
        commandId: commandId,
      ),
    ]);
    final legs = displayPaymentLegs(
      _invoice(method: encoded, status: 'Pending', total: 5, paid: 0),
    );
    expect(legs.single.commandId, commandId);
    expect(legs.single.confirmed, isFalse);
  });
}
