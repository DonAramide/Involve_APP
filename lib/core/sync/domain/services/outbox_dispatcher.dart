import 'package:involve_app/features/stock/data/datasources/app_database.dart';

abstract class OutboxHandler {
  /// Handles the outbox event.
  /// Throws an exception if processing fails (e.g., network error).
  Future<void> handle(Map<String, dynamic> payload, OutboxEvent event);
}

class OutboxDispatcher {
  final Map<String, OutboxHandler> _handlers = {};

  void register(String eventName, OutboxHandler handler) {
    _handlers[eventName] = handler;
  }

  Future<void> dispatch(String eventName, Map<String, dynamic> payload, OutboxEvent event) async {
    final handler = _handlers[eventName] ?? _handlers['*'];
    if (handler == null) {
      throw Exception('No handler registered for event: $eventName');
    }
    await handler.handle(payload, event);
  }

  Future<Map<String, dynamic>> dispatchBatch(List<OutboxEvent> events) async {
    final handler = _handlers['*'];
    if (handler == null) {
      throw Exception('No catch-all batch handler (*) registered');
    }
    
    if (handler is OutboxBatchHandler) {
      return await handler.handleBatch(events);
    } else {
      throw Exception('Catch-all handler must implement OutboxBatchHandler');
    }
  }
}

abstract class OutboxBatchHandler extends OutboxHandler {
  Future<Map<String, dynamic>> handleBatch(List<OutboxEvent> events);
  
  @override
  Future<void> handle(Map<String, dynamic> payload, OutboxEvent event) async {
    throw UnsupportedError('Use handleBatch instead');
  }
}
