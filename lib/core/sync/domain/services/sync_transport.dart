import '../models/sync_models.dart';

abstract class SyncTransport {
  Future<bool> checkHealth();
  Future<SyncBatch> pullUpdates(DateTime lastSyncTime);
  Future<void> pushUpdates(SyncBatch batch);
  void dispose();
}
