import 'dart:typed_data';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';

Future<bool> performSync(AppDatabase database, Uint8List backupBytes) async {
  // Web synchronization would require a different approach (e.g. drift-wasm in memory)
  return false;
}
