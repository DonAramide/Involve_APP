import 'package:uuid/uuid.dart';

import 'package:involve_app/core/sync/domain/services/finance_command_id.dart';

/// Holds the command identity of an in-flight financial operation so retries
/// and process recovery reuse it. A new user operation must call [release]
/// (or use a distinct [entityKey]) before [obtain] mints another id.
class PersistedFinanceCommandIds {
  PersistedFinanceCommandIds({
    Map<String, String>? memory,
    this.read,
    this.write,
    this.remove,
    this.now,
  }) : memory = memory ?? <String, String>{};

  static final PersistedFinanceCommandIds instance = PersistedFinanceCommandIds();

  final Map<String, String> memory;
  final Future<String?> Function(String key)? read;
  final Future<void> Function(String key, String value)? write;
  final Future<void> Function(String key)? remove;
  DateTime Function()? now;
  final Uuid _uuid = const Uuid();

  String _inflightKey(String action, String entityKey) =>
      'finance.inflight:${action.trim()}:${entityKey.trim()}';

  /// Reuse the in-flight identity for this logical operation, or mint one.
  Future<String> obtain({
    required String action,
    required String entityKey,
  }) async {
    final key = _inflightKey(action, entityKey);
    final existing = memory[key] ?? await read?.call(key);
    if (existing != null && existing.trim().length >= 16) {
      memory[key] = existing.trim();
      return existing.trim();
    }
    final id = _uuid.v4();
    memory[key] = id;
    await write?.call(key, id);
    return id;
  }

  /// End the current operation so the next user action gets a new identity.
  Future<void> release({
    required String action,
    required String entityKey,
  }) async {
    final key = _inflightKey(action, entityKey);
    memory.remove(key);
    await remove?.call(key);
  }

  void resetForTest() {
    memory.clear();
  }
}

/// Tenant-scoped? The device outbox key is the command id itself. Server
/// uniqueness is `(tenant_id, command_id)`. This helper only derives a stable
/// child id from a persisted parent operation id.
String derivedFinanceCommandId({
  required String action,
  required String operationId,
  required String part,
}) {
  return financeCommandId(action: action, entityId: operationId, part: part);
}
