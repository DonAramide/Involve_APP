import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:drift/drift.dart';
import 'package:sqflite/sqflite.dart' as sqflite;
import 'sync_logic.dart' as sync_logic;

class BackupService {
  static const String dbName = 'db.sqlite';
  final AppDatabase? database;

  BackupService({this.database});

  Future<String> getDatabasePath() async {
    if (kIsWeb) return dbName;
    try {
      final dbFolder = await sqflite.getDatabasesPath();
      return p.join(dbFolder, dbName);
    } catch (e) {
      // Fallback to documents if sqflite fails
      final docsDir = await getApplicationDocumentsDirectory();
      return p.join(docsDir.path, dbName);
    }
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

  /// Exports the entire database file to a target location
  Future<bool> exportDatabase(String targetPath) async {
    try {
      if (kIsWeb) return false;
      final dbPath = await getDatabasePath();
      final dbFile = File(dbPath);
      if (await dbFile.exists()) {
        await dbFile.copy(targetPath);
        return true;
      }
    } catch (e) {
      debugPrint('Export failed: $e');
    }
    return false;
  }

  /// Completely replaces the current database with a backup file
  Future<bool> importDatabase(String sourcePath) async {
    try {
      if (kIsWeb) return false;
      final dbPath = await getDatabasePath();
      
      // Close database before overwriting
      await database?.close();
      
      final sourceFile = File(sourcePath);
      if (await sourceFile.exists()) {
        await sourceFile.copy(dbPath);
        return true;
      }
    } catch (e) {
      debugPrint('Import failed: $e');
    }
    return false;
  }
}
