import 'dart:convert';
import 'package:drift/drift.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:involve_app/core/sync/domain/services/outbox_dispatcher.dart';
import 'package:involve_app/core/services/finance_api_client.dart';

class OutboxWorker {
  final AppDatabase _db;
  final OutboxDispatcher _dispatcher;
  bool _isRunning = false;

  OutboxWorker(this._db, this._dispatcher);

  /// Event-driven trigger. Can be called on app startup, network reconnect, etc.
  Future<void> triggerSync() async {
    if (_isRunning) return;
    _isRunning = true;
    try {
      await _processQueue();
    } finally {
      _isRunning = false;
    }
  }

  Future<void> _processQueue() async {
    final isOnlinePlan = await PlanGatingInterceptor.checkIsOnlinePlan();
    if (!isOnlinePlan) return;

    while (true) {
      final now = DateTime.now();
      
      final batch = await (_db.select(_db.outboxTable)
            ..where((t) =>
                t.status.isIn(['PENDING', 'FAILED']) &
                (t.nextRetryAt.isNull() | t.nextRetryAt.isSmallerOrEqualValue(now)))
            ..orderBy([
              (t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.asc),
              (t) => OrderingTerm(expression: t.id, mode: OrderingMode.asc),
            ])
            ..limit(20))
          .get();

      if (batch.isEmpty) break; // Queue is empty or waiting for backoff timers

      await _processBatch(batch);
    }
  }

  Future<void> _processBatch(List<OutboxEvent> batch) async {
    // 1. Mark all as processing
    for (final event in batch) {
      await (_db.update(_db.outboxTable)..where((t) => t.id.equals(event.id)))
          .write(OutboxTableCompanion(
              status: const Value('PROCESSING'),
              lastAttemptAt: Value(DateTime.now()),
              updatedAt: Value(DateTime.now())));
    }

    try {
      // 2. Dispatch batch
      final result = await _dispatcher.dispatchBatch(batch);
      
      final processedIds = (result['processedIds'] as List?)?.cast<String>() ?? [];
      final failedIds = (result['failedIds'] as List?) ?? [];

      // 3. Handle Successes
      for (final event in batch) {
        if (processedIds.contains(event.id)) {
          await (_db.update(_db.outboxTable)..where((t) => t.id.equals(event.id)))
              .write(OutboxTableCompanion(
                  status: const Value('COMPLETED'),
                  processedAt: Value(DateTime.now()),
                  updatedAt: Value(DateTime.now())));
        } else {
          // If it's not in processedIds, it failed. Find the reason.
          final failedItem = failedIds.firstWhere(
            (item) => item['eventId'] == event.id, 
            orElse: () => {'eventId': event.id, 'reason': 'Unknown failure', 'retryable': true}
          );
          
          await _handleFailure(
            event, 
            failedItem['reason'], 
            StackTrace.empty, 
            retryable: failedItem['retryable'] ?? true
          );
        }
      }
    } catch (e, stack) {
      // 4. Handle Catastrophic Failure (e.g. 500, Network error) for the entire batch
      for (final event in batch) {
        await _handleFailure(event, e, stack, retryable: true);
      }
    }
  }

  Future<void> _handleFailure(OutboxEvent event, Object error, StackTrace stack, {bool retryable = true}) async {
    final retryCount = event.retryCount + 1;
    // Immediate -> 30s -> 2m -> 5m -> 15m -> 1h -> DEAD_LETTER
    final isDeadLetter = !retryable || retryCount >= 6; 
    
    DateTime? nextRetry;
    if (!isDeadLetter) {
      nextRetry = DateTime.now().add(_getBackoffDuration(retryCount));
    }

    final String status = isDeadLetter ? 'DEAD_LETTER' : 'FAILED';
    
    await (_db.update(_db.outboxTable)..where((t) => t.id.equals(event.id)))
        .write(OutboxTableCompanion(
            status: Value(status),
            retryCount: Value(retryCount),
            nextRetryAt: Value(nextRetry),
            lastError: Value(error.toString()),
            failureReason: Value(error.toString()),
            stackTrace: Value(stack.toString()),
            updatedAt: Value(DateTime.now())));
  }

  Duration _getBackoffDuration(int retryCount) {
    switch (retryCount) {
      case 1: return const Duration(seconds: 30);
      case 2: return const Duration(minutes: 2);
      case 3: return const Duration(minutes: 5);
      case 4: return const Duration(minutes: 15);
      case 5: return const Duration(hours: 1);
      default: return const Duration(hours: 1); // Fallback
    }
  }
}
