import 'dart:typed_data';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';

class BackupService {
  final AppDatabase? database;

  BackupService({this.database});

  Future<String> getDatabasePath() async {
    return 'db.sqlite';
  }

  Future<Uint8List?> createBackup() async {
    return null;
  }

  Future<bool> syncData(Uint8List backupBytes) async {
    return false;
  }

  Future<bool> restoreBackup(String backupPath) async {
    return false;
  }
}
