import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/invoicing/domain/services/parent_wallet_payment.dart';
import 'package:involve_app/features/invoicing/domain/services/payment_balance_effect.dart';

void main() {
  group('canonical parent-wallet classification', () {
    test('Parent Credit and Parent Wallet are parent-wallet methods', () {
      expect(isParentWalletPaymentMethod('Parent Credit'), isTrue);
      expect(isSchoolParentWalletPayment('Parent Credit'), isTrue);
      expect(isSchoolParentWalletPayment('Parent Wallet'), isTrue);
    });

    test('Wallet+school reaches the allocation classifier', () {
      expect(
        isSchoolParentWalletPayment('Wallet', businessMode: 'school'),
        isTrue,
      );
      expect(
        isSchoolParentWalletPayment('Wallet', studentId: 9),
        isTrue,
      );
    });

    test('retail Wallet without a student is not school parent-wallet', () {
      expect(
        isSchoolParentWalletPayment('Wallet', businessMode: 'retail'),
        isFalse,
      );
      expect(isParentWalletPaymentMethod('Wallet'), isFalse);
    });

    test('cash, transfer, POS, and virtual account stay off parent-wallet', () {
      for (final method in ['Cash', 'Transfer', 'POS', 'VirtualAccount']) {
        expect(isSchoolParentWalletPayment(method, businessMode: 'school'), isFalse);
        expect(isParentWalletPaymentMethod(method), isFalse);
      }
    });
  });

  group('confirmed totals exclude pending parent-wallet', () {
    test('parent-wallet does not reduce spendable balances before ack', () {
      expect(
        shouldReduceOpenBalances('Parent Credit', businessMode: 'school'),
        isFalse,
      );
      expect(shouldReduceOpenBalances('Wallet', businessMode: 'school'), isFalse);
      expect(shouldReduceOpenBalances('Cash'), isTrue);
      expect(shouldReduceOpenBalances('POS'), isTrue);
      expect(shouldReduceOpenBalances('Transfer'), isFalse);
    });
  });
}
