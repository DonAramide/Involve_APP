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
  int get schemaVersion => 7;

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
        if (from < 3) {
          // Security lockout migration
          await m.addColumn(settings, settings.failedAttempts);
          await m.addColumn(settings, settings.isLocked);
          await m.addColumn(settings, settings.lockedAt);
        }
        if (from < 4) {
          // Company logo migration
          await m.addColumn(settings, settings.logo);
        }
        if (from < 5) {
          // Dark/Light mode migration
          await m.addColumn(settings, settings.themeMode);
        }
        if (from < 6) {
          // Business description migration
          await m.addColumn(settings, settings.businessDescription as GeneratedColumn<Object>);
        }
        if (from < 7) {
          // Price confirmation toggle migration
          await m.addColumn(settings, settings.confirmPriceOnSelection as GeneratedColumn<Object>);
        }
      },
      beforeOpen: (details) async {
        // Enforce Foreign Keys (SQLite only, harmless on Web/IndexedDB)
        await customStatement('PRAGMA foreign_keys = ON');
      },
    );
  }
}
