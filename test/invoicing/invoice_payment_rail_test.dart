import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/utils/invoice_payment_rail.dart';

void main() {
  test('company transfer stays transfer even if parent credit origin is va', () {
    expect(
      classifySalesRail('Transfer', originRail: 'va'),
      InvoicePaymentRail.bankTransfer,
    );
  });

  test('parent wallet stays on the school wallet, not VA transfer', () {
    expect(
      classifySalesRail('Wallet', originRail: 'va'),
      InvoicePaymentRail.wallet,
    );
    expect(
      classifySalesRail('Parent Credit', originRail: 'va'),
      InvoicePaymentRail.wallet,
    );
  });

  test('card labels used on the terminal count as card', () {
    expect(classifySalesRail('POS'), InvoicePaymentRail.card);
    expect(classifySalesRail('Card (POS)'), InvoicePaymentRail.card);
    expect(classifySalesRail('mPOS'), InvoicePaymentRail.card);
  });

  test('pay later is not a collected rail', () {
    expect(isPayLaterPaymentMethod('Deferred'), isTrue);
    expect(isPayLaterPaymentMethod('Pay later'), isTrue);
    expect(isPayLaterPaymentMethod('Cash'), isFalse);
    expect(isPayLaterPaymentMethod('Deferred + Wallet'), isFalse);
  });

  test('plain company transfer counts as transfer', () {
    expect(classifySalesRail('Transfer'), InvoicePaymentRail.bankTransfer);
  });

  test('company bank transfer label stays on transfer', () {
    expect(
      classifySalesRail('Company Bank Transfer'),
      InvoicePaymentRail.bankTransfer,
    );
    expect(
      classifySalesRail('Transfer (Personal Company account)'),
      InvoicePaymentRail.bankTransfer,
    );
  });
}
