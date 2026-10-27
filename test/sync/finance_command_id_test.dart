import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/sync/domain/services/finance_command_id.dart';
import 'package:involve_app/core/sync/domain/services/outbox_ack.dart';

void main() {
  test('same user action keeps the same command id across retries', () {
    final first = financeCommandId(
      action: 'invoice_pay',
      entityId: 'sync-1',
      part: '0.0:25.0:Cash',
    );
    final retry = financeCommandId(
      action: 'invoice_pay',
      entityId: 'sync-1',
      part: '0.0:25.0:Cash',
    );
    expect(first, retry);
    expect(RegExp(r'^\d+$').hasMatch(first), isFalse);
    expect(first.length, greaterThanOrEqualTo(16));
  });

  test('a later payment on the same invoice is a different command', () {
    final first = financeCommandId(action: 'invoice_pay', entityId: 'sync-1', part: '0.0:25.0:Cash');
    final second = financeCommandId(action: 'invoice_pay', entityId: 'sync-1', part: '25.0:25.0:Cash');
    expect(first, isNot(second));
  });

  test('timeout acknowledgement keeps the row retryable only for reconciliation-required', () {
    expect(outboxStatusForAck('accepted'), 'COMPLETED');
    expect(outboxStatusForAck('duplicate'), 'COMPLETED');
    expect(outboxStatusForAck('rejected'), 'DEAD_LETTER');
    expect(outboxAckRetryable('reconciliation-required'), isTrue);
  });
}
