import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:drift/drift.dart';

void main() {
  final db = AppDatabase();
  
  print('--- BEGIN SCHEMA ---');
  for (final table in db.allTables) {
    print('CREATE TABLE IF NOT EXISTS "${table.actualTableName}" (');
    final columns = table.$columns;
    final columnDefs = <String>[];
    for (var i = 0; i < columns.length; i++) {
      final col = columns[i];
      final name = col.name;
      final type = _getSqlType(col.type);
      final nullable = col.requiredDuringInsert ? 'NOT NULL' : '';
      columnDefs.add('  "$name" $type $nullable');
    }
    print(columnDefs.join(',\n'));
    print(');\n');
  }
  print('--- END SCHEMA ---');
}

String _getSqlType(DriftSqlType type) {
  switch (type) {
    case DriftSqlType.int:
      return 'INTEGER';
    case DriftSqlType.string:
      return 'VARCHAR(255)';
    case DriftSqlType.bool:
      return 'BOOLEAN';
    case DriftSqlType.dateTime:
      return 'TIMESTAMP';
    case DriftSqlType.blob:
      return 'BYTEA';
    case DriftSqlType.double:
      return 'DOUBLE PRECISION';
    default:
      return 'TEXT';
  }
}
