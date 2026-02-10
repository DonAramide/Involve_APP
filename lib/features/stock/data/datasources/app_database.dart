import 'package:drift/drift.dart';
import 'connection_native.dart' if (dart.library.html) 'connection_web.dart' as connection;
import '../../../invoicing/data/models/invoice_table.dart';
import '../../../settings/data/models/settings_table.dart';
import '../models/item_table.dart';
import '../models/category_table.dart';

part 'app_database.g.dart';

@DriftDatabase(tables: [Items, Invoices, InvoiceItems, Settings, Categories])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(connection.connect());

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (Migrator m) async {
        await m.createAll();
      },
      onUpgrade: (Migrator m, int from, int to) async {
        if (from < 2) {
          // Phase 2 Migration
          await m.createTable(categories);
          await m.addColumn(items, items.image);
          await m.addColumn(items, items.categoryId);
        }
      },
      beforeOpen: (details) async {
        // Enforce Foreign Keys (SQLite only, harmless on Web/IndexedDB)
        await customStatement('PRAGMA foreign_keys = ON');
      },
    );
  }
}
