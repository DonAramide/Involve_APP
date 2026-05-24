import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';

void main() async {
  // Use an in-memory database
  final db = AppDatabase();
  
  // Wait for the database to open and create tables
  await db.customSelect('SELECT 1').get();
  
  // Query sqlite_master for all CREATE TABLE statements
  final results = await db.customSelect('SELECT sql FROM sqlite_master WHERE type="table" AND name NOT LIKE "sqlite_%"').get();
  
  print('--- BEGIN SCHEMA ---');
  for (final row in results) {
    print(row.read<String>('sql') + ';');
    print('');
  }
  print('--- END SCHEMA ---');
  
  await db.close();
}
