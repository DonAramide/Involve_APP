import 'package:drift/drift.dart';
import 'package:drift_sqflite/drift_sqflite.dart';
import '../../../invoicing/data/models/invoice_table.dart';
import '../../../settings/data/models/settings_table.dart';
import '../models/item_table.dart';

part 'app_database.g.dart';

@DriftDatabase(tables: [Items, Invoices, InvoiceItems, Settings])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    return SqfliteQueryExecutor.inDatabaseFolder(path: 'db.sqlite');
  });
}
