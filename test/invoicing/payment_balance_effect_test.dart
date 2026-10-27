import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/invoicing/domain/services/payment_balance_effect.dart';
import 'package:involve_app/core/sync/domain/services/outbox_ack.dart';
import 'package:involve_app/features/services/domain/services/customer_wallet_credit_service.dart';

void main() {
  group('unconfirmed transfer balance effect', () {
    test('Transfer and VA do not reduce student/customer balances', () {
      expect(shouldReduceOpenBalances('Transfer'), isFalse);
      expect(shouldReduceOpenBalances('VirtualAccount'), isFalse);
      expect(shouldReduceOpenBalances('VA Transfer'), isFalse);
      expect(isUnconfirmedTransferMethod('transfer'), isTrue);
    });

    test('Cash and card still reduce open balances; parent-wallet waits for ack', () {
      expect(shouldReduceOpenBalances('Cash'), isTrue);
      expect(shouldReduceOpenBalances('Card'), isTrue);
      expect(shouldReduceOpenBalances('Parent Credit'), isFalse);
    });
  });

  group('outbox acknowledgements', () {
    test('accepted and duplicate complete; rejected is dead-letter; recon retries', () {
      expect(outboxStatusForAck('accepted'), 'COMPLETED');
      expect(outboxStatusForAck('duplicate'), 'COMPLETED');
      expect(outboxStatusForAck('rejected'), 'DEAD_LETTER');
      expect(outboxStatusForAck('reconciliation-required'), 'FAILED');
      expect(outboxAckRetryable('reconciliation-required'), isTrue);
      expect(outboxAckRetryable('rejected'), isFalse);
    });
  });

  group('parent credit overwrite', () {
    test('local recalculation does not write parent credit', () async {
      final wrote = await CustomerWalletCreditService.instance.recalculateParentCredit(
        accountNumber: '1234567890',
        quasarBalance: 100,
      );
      final aligned = await CustomerWalletCreditService.instance.alignParentCreditToQuasar(
        accountNumber: '1234567890',
        quasarBalance: 100,
      );
      expect(wrote, isFalse);
      expect(aligned, isFalse);
    });
  });
}
