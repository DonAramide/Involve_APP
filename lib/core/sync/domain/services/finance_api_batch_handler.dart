import 'dart:convert';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/core/sync/domain/services/outbox_dispatcher.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';

class FinanceApiBatchHandler extends OutboxBatchHandler {
  final FinanceApiClient _apiClient;

  FinanceApiBatchHandler(this._apiClient);

  @override
  Future<Map<String, dynamic>> handleBatch(List<OutboxEvent> events) async {
    final payloadList = events.map((e) {
      return {
        'eventId': e.id,
        'eventName': e.eventName,
        'aggregateType': e.aggregateType,
        'aggregateId': e.aggregateId,
        'idempotencyKey': e.idempotencyKey,
        'createdAt': e.createdAt.toIso8601String(),
        'payload': jsonDecode(e.payload),
      };
    }).toList();

    return await _apiClient.syncOutboxBatch(payloadList);
  }
}
