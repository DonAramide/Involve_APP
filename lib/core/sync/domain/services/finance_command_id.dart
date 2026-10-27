import 'package:uuid/uuid.dart';

/// Stable command ID for one user action. Timeouts and app restarts must
/// reuse this value; it is never a timestamp-only id.
String financeCommandId({
  required String action,
  required String entityId,
  Object? part,
}) {
  final material = 'invify:$action:${entityId.trim()}:${part ?? ''}';
  return const Uuid().v5(Uuid.NAMESPACE_URL, material);
}
