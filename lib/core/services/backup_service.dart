import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:drift/drift.dart';
import 'sync_logic.dart' as sync_logic;

class BackupService {
  static const String dbName = 'db.sqlite';
  final AppDatabase? database;

  BackupService({this.database});

  Future<String> getDatabasePath() async {
    if (kIsWeb) return dbName;
    final docsDir = await getApplicationDocumentsDirectory();
    return p.join(docsDir.path, dbName);
  }

  Future<Uint8List?> createBackup() async {
    try {
      if (kIsWeb) return null;

      final dbPath = await getDatabasePath();
      final dbFile = File(dbPath);
      
      if (await dbFile.exists()) {
        return await dbFile.readAsBytes();
      }
    } catch (e) {
      debugPrint('Backup creation failed: $e');
    }
    return null;
  }

  /// Synchronizes data from a backup bytes into the current database
  Future<bool> syncData(Uint8List backupBytes) async {
    if (database == null) return false;
    return await sync_logic.performSync(database!, backupBytes);
  }

  Future<bool> restoreBackup(String backupPath) async {
    try {
      if (kIsWeb) return false;
      
      final dbPath = await getDatabasePath();
      final backupFile = File(backupPath);
      
      if (await backupFile.exists()) {
        final bytes = await backupFile.readAsBytes();
        return await syncData(bytes);
      }
    } catch (e) {
      debugPrint('Restore failed: $e');
    }
    return false;
  }
}
