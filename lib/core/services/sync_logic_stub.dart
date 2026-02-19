import 'dart:typed_data';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';

Future<bool> performSync(AppDatabase database, Uint8List backupBytes) async {
  throw UnsupportedError('Synchronization is not supported on this platform.');
}
