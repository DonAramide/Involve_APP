import 'dart:convert';
import 'package:uuid/uuid.dart';
import 'package:drift/drift.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:involve_app/core/sync/domain/services/session_context.dart';

class OutboxPublisher {
  final SessionContext _sessionContext;
  final Uuid _uuid = const Uuid();

  OutboxPublisher(this._sessionContext);

  /// Publishes an event to the Outbox.
  /// Ensure this is called within a database transaction context by passing `tx` as the `db` parameter.
  Future<void> publish<T>({
    required GeneratedDatabase db,
    required String eventName,
    required String aggregateType,
    required String aggregateId,
    required T payload,
    required Map<String, dynamic> Function(T) serializer,
    int eventVersion = 1,
  }) async {
    final appDb = db as AppDatabase;
    final tenantId = await _sessionContext.getTenantId() ?? 'UNKNOWN_TENANT';
    final deviceId = await _sessionContext.getDeviceId() ?? 'UNKNOWN_DEVICE';
    
    // In a real flow, correlation_id might be passed down from an upstream operation
    final correlationId = _uuid.v4();
    final idempotencyKey = _uuid.v4();
    
    final payloadJson = jsonEncode(serializer(payload));

    await appDb.into(appDb.outboxTable).insert(
      OutboxTableCompanion.insert(
        id: _uuid.v4(),
        tenantId: tenantId,
        deviceId: deviceId,
        correlationId: correlationId,
        idempotencyKey: idempotencyKey,
        aggregateType: aggregateType,
        aggregateId: aggregateId,
        eventName: eventName,
        eventVersion: eventVersion,
        payload: payloadJson,
        status: const Value('PENDING'),
        retryCount: const Value(0),
      )
    );
  }
}
