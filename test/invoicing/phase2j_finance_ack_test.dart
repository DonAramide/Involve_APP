import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/sync/domain/services/outbox_publisher.dart';
import 'package:involve_app/core/sync/domain/services/session_context.dart';
import 'package:involve_app/features/invoicing/data/repositories/invoice_repository_impl.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:drift/drift.dart';

class _Session implements SessionContext {
  @override
  Future<String?> getTenantId() async => 'test_tenant';
  @override
  Future<String?> getDeviceId() async => 'test_device';
  @override
  Future<String?> getUserId() async => 'test_user';
  @override
  Future<String?> getTenantCode() async => 'test_code';
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppDatabase db;
  late InvoiceRepositoryImpl repo;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    repo = InvoiceRepositoryImpl(
      db,
      outboxPublisher: OutboxPublisher(_Session()),
    );
  });

  tearDown(() async {
    await db.close();
  });

  Future<int> insertUnpaid() async {
    return db.into(db.invoices).insert(
          InvoicesCompanion.insert(
            invoiceNumber: 'INV-P2J',
            subtotal: 10,
            taxAmount: 0,
            discountAmount: 0,
            totalAmount: 10,
            paymentStatus: 'Unpaid',
            amountPaid: const Value(0),
            balanceAmount: const Value(10),
            syncId: const Value('sync-p2j'),
            businessMode: const Value('school'),
            studentId: const Value(1),
          ),
        );
  }

  test('no confirmed balance increase before acknowledgement', () async {
    final id = await insertUnpaid();
    await repo.recordPayment(
      id,
      10,
      'Parent Credit',
      commandId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
    final invoice = await repo.getInvoiceById(id);
    expect(invoice!.paymentStatus, 'Pending');
    expect(invoice.amountPaid, 0);
    expect(invoice.collectedAmount, 0);
    final outbox = await db.select(db.outboxTable).get();
    expect(outbox.where((e) => e.eventName == 'finance.invoice_pay'), isNotEmpty);
    expect(outbox.firstWhere((e) => e.eventName == 'finance.invoice_pay').status, 'PENDING');
  });

  test('accepted and duplicate acknowledgements confirm local collected totals', () async {
    final id = await insertUnpaid();
    const commandId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    await repo.recordPayment(id, 10, 'Parent Credit', commandId: commandId);
    await repo.applyFinanceAck(commandId: commandId, ack: 'accepted');
    var invoice = await repo.getInvoiceById(id);
    expect(invoice!.collectedAmount, 10);
    expect(invoice.displayPaymentStatus, 'Paid');

    final id2 = await db.into(db.invoices).insert(
          InvoicesCompanion.insert(
            invoiceNumber: 'INV-P2J-2',
            subtotal: 4,
            taxAmount: 0,
            discountAmount: 0,
            totalAmount: 4,
            paymentStatus: 'Unpaid',
            amountPaid: const Value(0),
            balanceAmount: const Value(4),
            syncId: const Value('sync-p2j-2'),
            businessMode: const Value('school'),
            studentId: const Value(1),
          ),
        );
    const dup = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    await repo.recordPayment(id2, 4, 'Wallet', commandId: dup);
    await repo.applyFinanceAck(commandId: dup, ack: 'duplicate');
    invoice = await repo.getInvoiceById(id2);
    expect(invoice!.collectedAmount, 4);
  });

  test('rejected commands and restart leave pending recoverable without reversing others', () async {
    final paidId = await db.into(db.invoices).insert(
          InvoicesCompanion.insert(
            invoiceNumber: 'INV-CASH',
            subtotal: 3,
            taxAmount: 0,
            discountAmount: 0,
            totalAmount: 3,
            paymentStatus: 'Paid',
            amountPaid: const Value(3),
            balanceAmount: const Value(0),
            paymentMethod: const Value('Cash'),
            syncId: const Value('sync-cash'),
            businessMode: const Value('school'),
          ),
        );
    final id = await insertUnpaid();
    const commandId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    await repo.recordPayment(id, 10, 'Parent Credit', commandId: commandId);
    await repo.applyFinanceAck(commandId: commandId, ack: 'rejected');
    var pending = await repo.getInvoiceById(id);
    final cash = await repo.getInvoiceById(paidId);
    expect(pending!.collectedAmount, 0);
    expect(pending.paymentStatus, 'Pending');
    expect(cash!.collectedAmount, 3);

    repo = InvoiceRepositoryImpl(
      db,
      outboxPublisher: OutboxPublisher(_Session()),
    );
    pending = await repo.getInvoiceById(id);
    expect(pending!.paymentStatus, 'Pending');
    expect(pending.paymentMethod, contains(commandId));
  });

  test('timeout after server commit retries the same command identity', () async {
    final id = await insertUnpaid();
    const commandId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    await repo.recordPayment(id, 10, 'Parent Credit', commandId: commandId);
    await repo.enqueueFinanceCommand(
      eventName: 'finance.invoice_pay',
      commandId: commandId,
      payload: const {'amount': 10, 'paymentMethod': 'Parent Credit'},
    );
    final rows = await (db.select(db.outboxTable)
          ..where((t) => t.idempotencyKey.equals(commandId)))
        .get();
    expect(rows, hasLength(1));
  });

  test('cash transfer POS and virtual account keep their existing confirmation rules', () async {
    final cashId = await insertUnpaid();
    await repo.recordPayment(cashId, 10, 'Cash');
    expect((await repo.getInvoiceById(cashId))!.paymentStatus, 'Paid');

    final posId = await db.into(db.invoices).insert(
          InvoicesCompanion.insert(
            invoiceNumber: 'INV-POS',
            subtotal: 2,
            taxAmount: 0,
            discountAmount: 0,
            totalAmount: 2,
            paymentStatus: 'Unpaid',
            amountPaid: const Value(0),
            balanceAmount: const Value(2),
            syncId: const Value('sync-pos'),
            businessMode: const Value('school'),
          ),
        );
    await repo.recordPayment(posId, 2, 'POS');
    expect((await repo.getInvoiceById(posId))!.paymentStatus, 'Paid');

    final tfId = await db.into(db.invoices).insert(
          InvoicesCompanion.insert(
            invoiceNumber: 'INV-TF',
            subtotal: 7,
            taxAmount: 0,
            discountAmount: 0,
            totalAmount: 7,
            paymentStatus: 'Unpaid',
            amountPaid: const Value(0),
            balanceAmount: const Value(7),
            syncId: const Value('sync-tf'),
            businessMode: const Value('school'),
          ),
        );
    await repo.recordPayment(tfId, 7, 'Transfer');
    expect((await repo.getInvoiceById(tfId))!.paymentStatus, 'Pending');
    expect((await repo.getInvoiceById(tfId))!.collectedAmount, 0);

    final vaId = await db.into(db.invoices).insert(
          InvoicesCompanion.insert(
            invoiceNumber: 'INV-VA',
            subtotal: 1,
            taxAmount: 0,
            discountAmount: 0,
            totalAmount: 1,
            paymentStatus: 'Unpaid',
            amountPaid: const Value(0),
            balanceAmount: const Value(1),
            syncId: const Value('sync-va'),
            businessMode: const Value('school'),
          ),
        );
    await repo.recordPayment(vaId, 1, 'VirtualAccount');
    expect((await repo.getInvoiceById(vaId))!.collectedAmount, 0);
  });
}
