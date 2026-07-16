import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:uuid/uuid.dart';

import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:involve_app/core/sync/domain/services/outbox_publisher.dart';
import 'package:involve_app/core/sync/domain/services/outbox_worker.dart';
import 'package:involve_app/core/sync/domain/services/outbox_dispatcher.dart';
import 'package:involve_app/core/sync/domain/services/session_context.dart';
import 'package:involve_app/features/invoicing/data/repositories/invoice_repository_impl.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';

class MockSessionContext implements SessionContext {
  @override
  Future<String?> getTenantId() async => 'test_tenant';
  @override
  Future<String?> getDeviceId() async => 'test_device';
  @override
  Future<String?> getUserId() async => 'test_user';
  @override
  Future<String?> getTenantCode() async => 'test_code';
}

class MockApiHandler implements OutboxHandler {
  bool isOnline = false;
  bool force500Error = false;
  final List<Map<String, dynamic>> dispatchedPayloads = [];

  @override
  Future<void> handle(Map<String, dynamic> payload, OutboxEvent event) async {
    if (!isOnline) {
      throw Exception('Network Error: No connectivity');
    }
    if (force500Error) {
      throw Exception('HTTP 500: Internal Server Error');
    }
    dispatchedPayloads.add(payload);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppDatabase db;
  late MockSessionContext sessionContext;
  late OutboxPublisher outboxPublisher;
  late OutboxDispatcher dispatcher;
  late MockApiHandler apiHandler;
  late InvoiceRepositoryImpl invoiceRepo;
  late OutboxWorker worker;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    sessionContext = MockSessionContext();
    outboxPublisher = OutboxPublisher(sessionContext);
    
    apiHandler = MockApiHandler();
    dispatcher = OutboxDispatcher();
    dispatcher.register('invoice.created', apiHandler);
    
    invoiceRepo = InvoiceRepositoryImpl(db, outboxPublisher: outboxPublisher);
    worker = OutboxWorker(db, dispatcher);
  });

  tearDown(() async {
    await db.close();
  });

  test('Gate 10 Certification: Flutter Sync Architecture', () async {
    // ---------------------------------------------------------
    // Phase A: Offline Integrity
    // ---------------------------------------------------------
    apiHandler.isOnline = false; // Airplane mode

    final invoice = Invoice(
      invoiceNumber: 'INV-100',
      dateCreated: DateTime.now(),
      items: const [],
      subtotal: 100,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 100,
      paymentStatus: 'Unpaid',
      amountPaid: 0,
      balanceAmount: 100,
      syncId: const Uuid().v4(),
    );

    await invoiceRepo.saveInvoice(invoice);

    final outboxEvents = await db.select(db.outboxTable).get();
    expect(outboxEvents.length, 1, reason: 'Outbox should contain 1 event');
    expect(outboxEvents.first.status, 'PENDING', reason: 'Status must be PENDING offline');

    // ---------------------------------------------------------
    // Phase B: Recovery (App Force Close)
    // ---------------------------------------------------------
    // Simulate force close by dropping the worker and creating a new one
    worker = OutboxWorker(db, dispatcher);
    // Queue should still be intact
    final recoveredEvents = await db.select(db.outboxTable).get();
    expect(recoveredEvents.length, 1);
    expect(recoveredEvents.first.status, 'PENDING');

    // Add a 1-second delay to guarantee distinct SQLite CURRENT_TIMESTAMP values
    // otherwise UUID alphabetical sorting may break FIFO.
    await Future.delayed(const Duration(seconds: 1));

    // ---------------------------------------------------------
    // Phase C: Network Recovery & FIFO Verification
    // ---------------------------------------------------------
    apiHandler.isOnline = true; // Restore connectivity
    
    // Create a second invoice to verify FIFO
    final invoice2 = Invoice(
      invoiceNumber: 'INV-101',
      dateCreated: DateTime.now(),
      items: const [],
      subtotal: 200,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 200,
      paymentStatus: 'Unpaid',
      amountPaid: 0,
      balanceAmount: 200,
      syncId: const Uuid().v4(),
    );
    await invoiceRepo.saveInvoice(invoice2);

    await worker.triggerSync();

    final syncedEvents = await db.select(db.outboxTable).get();
    expect(syncedEvents[0].status, 'COMPLETED');
    expect(syncedEvents[1].status, 'COMPLETED');
    expect(apiHandler.dispatchedPayloads.length, 2);
    expect(apiHandler.dispatchedPayloads[0]['invoiceNumber'], 'INV-100', reason: 'FIFO violated');
    expect(apiHandler.dispatchedPayloads[1]['invoiceNumber'], 'INV-101', reason: 'FIFO violated');

    // ---------------------------------------------------------
    // Phase E: Failure Handling (HTTP 500)
    // ---------------------------------------------------------
    apiHandler.force500Error = true;
    
    final invoice3 = Invoice(
      invoiceNumber: 'INV-102',
      dateCreated: DateTime.now(),
      items: const [],
      subtotal: 300,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 300,
      paymentStatus: 'Unpaid',
      amountPaid: 0,
      balanceAmount: 300,
      syncId: const Uuid().v4(),
    );
    await invoiceRepo.saveInvoice(invoice3);

    // 1st Attempt (Fails -> 30s Backoff)
    await worker.triggerSync();
    var failedEvents = await (db.select(db.outboxTable)..where((t) => t.aggregateId.equals(invoice3.syncId!))).get();
    expect(failedEvents.first.status, 'FAILED');
    expect(failedEvents.first.retryCount, 1);
    expect(failedEvents.first.nextRetryAt != null, isTrue);

    // Simulate 6 more attempts bypassing the backoff by setting nextRetryAt to now
    for (int i = 0; i < 5; i++) {
      await (db.update(db.outboxTable)..where((t) => t.aggregateId.equals(invoice3.syncId!)))
          .write(OutboxTableCompanion(nextRetryAt: Value(DateTime.now().subtract(const Duration(seconds: 1)))));
      await worker.triggerSync();
    }

    // After 6 total attempts, it should be DEAD_LETTER
    final dlqEvents = await (db.select(db.outboxTable)..where((t) => t.aggregateId.equals(invoice3.syncId!))).get();
    expect(dlqEvents.first.status, 'DEAD_LETTER');
    expect(dlqEvents.first.retryCount, 6);
  });
}
