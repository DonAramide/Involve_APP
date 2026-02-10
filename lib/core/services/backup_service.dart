import 'dart:io';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

class BackupService {
  static const String dbName = 'db.sqlite';

  Future<String> getDatabasePath() async {
    final docsDir = await getApplicationDocumentsDirectory();
    return p.join(docsDir.path, dbName);
  }

  Future<File?> createBackup() async {
    try {
      final dbPath = await getDatabasePath();
      final dbFile = File(dbPath);
      
      if (await dbFile.exists()) {
        final backupDir = await getExternalStorageDirectory(); // Or other public dir
        if (backupDir == null) return null;
        
        final timestamp = DateTime.now().millisecondsSinceEpoch;
        final backupPath = p.join(backupDir.path, 'backup_$timestamp.sqlite');
        
        return await dbFile.copy(backupPath);
      }
    } catch (e) {
      print('Backup failed: $e');
    }
    return null;
  }

  Future<bool> restoreBackup(String backupPath) async {
    try {
      final dbPath = await getDatabasePath();
      final backupFile = File(backupPath);
      
      if (await backupFile.exists()) {
        await backupFile.copy(dbPath);
        return true;
      }
    } catch (e) {
      print('Restore failed: $e');
    }
    return false;
  }
}
