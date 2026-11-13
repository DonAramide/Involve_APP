import 'dart:convert';
import 'package:flutter/services.dart';
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
import 'package:involve_app/core/license/storage_service.dart';
import 'package:path_provider_platform_interface/path_provider_platform_interface.dart';
import 'dart:io';

class _FakePathProvider extends PathProviderPlatform {
  _FakePathProvider(this.root);
  final String root;

  @override
  Future<String?> getApplicationSupportPath() async => root;

  @override
  Future<String?> getApplicationDocumentsPath() async => root;

  @override
  Future<String?> getTemporaryPath() async => root;
}

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

class MockBatchApiHandler extends OutboxBatchHandler {
  bool isOnline = false;
  bool force500Error = false;
  final List<Map<String, dynamic>> dispatchedPayloads = [];

  @override
  Future<void> handle(Map<String, dynamic> payload, OutboxEvent event) async {
    throw UnsupportedError('Use handleBatch');
  }

  @override
  Future<Map<String, dynamic>> handleBatch(List<OutboxEvent> events) async {
    if (!isOnline) {
      throw Exception('Network Error: No connectivity');
    }
    if (force500Error) {
      throw Exception('HTTP 500: Internal Server Error');
    }

    final processedIds = <String>[];
    final acks = <Map<String, dynamic>>[];
    for (final event in events) {
      final payload = jsonDecode(event.payload) as Map<String, dynamic>;
      dispatchedPayloads.add(payload);
      processedIds.add(event.id);
      acks.add({'eventId': event.id, 'status': 'accepted'});
    }
    return {
      'processedIds': processedIds,
      'failedIds': <Map<String, dynamic>>[],
      'acks': acks,
    };
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppDatabase db;
  late MockSessionContext sessionContext;
  late OutboxPublisher outboxPublisher;
  late OutboxDispatcher dispatcher;
  late MockBatchApiHandler apiHandler;
  late InvoiceRepositoryImpl invoiceRepo;
  late OutboxWorker worker;
  late Map<String, String> secureStore;

  setUp(() async {
    final supportDir = await Directory.systemTemp.createTemp('invify_sync_harness_');
    PathProviderPlatform.instance = _FakePathProvider(supportDir.path);

    secureStore = <String, String>{
      // Unlocks PlanGatingInterceptor.checkIsOnlinePlan for the harness.
      'device_lifetime_authorized': 'true',
      'online_sync_enabled': 'true',
    };

    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
      (MethodCall call) async {
        final args = (call.arguments as Map?)?.cast<String, dynamic>() ?? {};
        final key = args['key']?.toString();
        switch (call.method) {
          case 'read':
            return key == null ? null : secureStore[key];
          case 'write':
            if (key != null) secureStore[key] = args['value']?.toString() ?? '';
            return null;
          case 'delete':
            if (key != null) secureStore.remove(key);
            return null;
          case 'readAll':
            return Map<String, String>.from(secureStore);
          case 'deleteAll':
            secureStore.clear();
            return null;
          default:
            return null;
        }
      },
    );

    // InvoiceRepositoryImpl.saveInvoice resolves device identity via DeviceInfoService.
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('com.invify.app/mpos'),
      (MethodCall call) async {
        if (call.method == 'getHardwareSerial' ||
            call.method == 'getMposSerialNumber') {
          return 'HARNESSDEVICE001';
        }
        return null;
      },
    );
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('flutter.baseflow.com/permissions/methods'),
      (MethodCall call) async {
        if (call.method == 'checkPermissionStatus' ||
            call.method == 'requestPermissions') {
          return 1;
        }
        return null;
      },
    );

    db = AppDatabase.forTesting(NativeDatabase.memory());
    sessionContext = MockSessionContext();
    outboxPublisher = OutboxPublisher(sessionContext);

    apiHandler = MockBatchApiHandler();
    dispatcher = OutboxDispatcher();
    dispatcher.register('*', apiHandler);

    invoiceRepo = InvoiceRepositoryImpl(db, outboxPublisher: outboxPublisher);
    worker = OutboxWorker(db, dispatcher);

    // Unlock online sync without requiring native secure-storage plugins.
    await StorageService.saveProExpiryDate(
      DateTime.now().add(const Duration(days: 30)),
    );
  });

  tearDown(() async {
    await db.close();
  });

  test('Gate 10 Certification: Flutter Sync Architecture', () async {
    // ---------------------------------------------------------
    // Phase A: Offline Integrity
    // ---------------------------------------------------------
    apiHandler.isOnline = false;

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
    worker = OutboxWorker(db, dispatcher);
    final recoveredEvents = await db.select(db.outboxTable).get();
    expect(recoveredEvents.length, 1);
    expect(recoveredEvents.first.status, 'PENDING');

    await Future.delayed(const Duration(seconds: 1));

    // ---------------------------------------------------------
    // Phase C: Network Recovery & FIFO Verification
    // ---------------------------------------------------------
    apiHandler.isOnline = true;

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

    await worker.triggerSync();
    var failedEvents = await (db.select(db.outboxTable)
          ..where((t) => t.aggregateId.equals(invoice3.syncId!)))
        .get();
    expect(failedEvents.first.status, 'FAILED');
    expect(failedEvents.first.retryCount, 1);
    expect(failedEvents.first.nextRetryAt != null, isTrue);

    for (int i = 0; i < 5; i++) {
      await (db.update(db.outboxTable)
            ..where((t) => t.aggregateId.equals(invoice3.syncId!)))
          .write(OutboxTableCompanion(
              nextRetryAt: Value(DateTime.now().subtract(const Duration(seconds: 1)))));
      await worker.triggerSync();
    }

    final dlqEvents = await (db.select(db.outboxTable)
          ..where((t) => t.aggregateId.equals(invoice3.syncId!)))
        .get();
    expect(dlqEvents.first.status, 'DEAD_LETTER');
    expect(dlqEvents.first.retryCount, 6);
  });
}
