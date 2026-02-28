import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:involve_app/core/sync/data/repositories/sync_repository_impl.dart';

class SyncServer {
  final AppDatabase database;
  final SyncRepository syncRepository;
  final String secretToken;

  SyncServer({
    required this.database,
    required this.syncRepository,
    required this.secretToken,
  });

  Future<void> start(int port) async {
    // No-op on Web
  }

  void stop() {
    // No-op on Web
  }
}
