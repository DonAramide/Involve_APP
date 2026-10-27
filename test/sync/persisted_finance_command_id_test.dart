import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/sync/domain/services/finance_command_id.dart';
import 'package:involve_app/core/sync/domain/services/persisted_finance_command_id.dart';

void main() {
  late PersistedFinanceCommandIds store;

  setUp(() {
    store = PersistedFinanceCommandIds();
  });

  test('parent fund/map retry reuses the original identity', () async {
    final first = await store.obtain(action: 'parent_allocate', entityKey: 'parent:1');
    final retry = await store.obtain(action: 'parent_allocate', entityKey: 'parent:1');
    expect(retry, first);
    expect(first.length, greaterThanOrEqualTo(16));
  });

  test('a new user operation after release receives a new identity', () async {
    final first = await store.obtain(action: 'parent_fund', entityKey: 'parent:1');
    await store.release(action: 'parent_fund', entityKey: 'parent:1');
    final second = await store.obtain(action: 'parent_fund', entityKey: 'parent:1');
    expect(second, isNot(first));
  });

  test('timeout after commit still reuses the same derived allocate identity', () {
    const operationId = '77777777-7777-4777-8777-777777777777';
    final first = derivedFinanceCommandId(
      action: 'parent_allocate',
      operationId: operationId,
      part: 'alloc',
    );
    final retry = derivedFinanceCommandId(
      action: 'parent_allocate',
      operationId: operationId,
      part: 'alloc',
    );
    expect(retry, first);
    expect(
      first,
      financeCommandId(action: 'parent_allocate', entityId: operationId, part: 'alloc'),
    );
  });

  test('two separate payments are not collapsed by amount+invoice', () {
    final a = financeCommandId(
      action: 'invoice_pay',
      entityId: 'inv-1',
      part: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
    final b = financeCommandId(
      action: 'invoice_pay',
      entityId: 'inv-1',
      part: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    );
    expect(a, isNot(b));
  });
}
