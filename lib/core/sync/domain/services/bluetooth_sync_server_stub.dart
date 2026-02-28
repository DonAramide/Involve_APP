import 'package:involve_app/core/sync/data/repositories/sync_repository_impl.dart';

class BluetoothSyncServer {
  final SyncRepository syncRepository;
  final String deviceId;

  BluetoothSyncServer({required this.syncRepository, required this.deviceId});

  Future<void> start() async {
    // No-op on Web
  }

  Future<void> stop() async {
    // No-op on Web
  }
}
