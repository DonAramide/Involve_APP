import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:involve_app/features/settings/data/models/staff_table.dart';
import 'connection_native.dart' if (dart.library.html) 'connection_web.dart' as connection;
import 'package:involve_app/features/invoicing/data/models/invoice_table.dart';
import 'package:involve_app/features/settings/data/models/settings_table.dart';
import 'package:involve_app/features/stock/data/models/item_table.dart';
import 'package:involve_app/features/stock/data/models/category_table.dart';
import 'package:involve_app/core/sync/data/models/sync_meta_table.dart';
import 'package:involve_app/core/license/license_history_table.dart';

part 'app_database.g.dart';

@DriftDatabase(tables: [Items, Invoices, InvoiceItems, Settings, Categories, LicenseHistory, Staff, SyncMeta, StockIncrements])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(connection.connect());

  @override
  int get schemaVersion => 28;

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (Migrator m) async {
        await m.createAll();
      },
      onUpgrade: (Migrator m, int from, int to) async {
        // ... previous migrations ...
        if (from < 25) {
          // Custom Receipt Pricing Migration
          await _safeAddColumn(m, settings, settings.customReceiptPricingEnabled);
          await _safeAddColumn(m, invoices, invoices.totalPrintAmount);
          await _safeAddColumn(m, invoiceItems, invoiceItems.printPrice);
        }
        if (from < 26) {
          // Logo Printing Toggle Migration
          await _safeAddColumn(m, settings, settings.showLogo);
        }
        if (from < 28) {
          // CAC Number Migration
          await _safeAddColumn(m, settings, settings.cacNumber);
          await _safeAddColumn(m, settings, settings.showCacNumber);
        }
      },
      beforeOpen: (details) async {
        // Enforce Foreign Keys (SQLite only, harmless on Web/IndexedDB)
        await customStatement('PRAGMA foreign_keys = ON');
      },
    );
  }

  /// Safely adds a column, silently ignoring the error if it already exists.
  /// This prevents migration failures when a column was already applied in
  /// a prior debug build or partial upgrade.
  Future<void> _safeAddColumn(Migrator m, TableInfo table, GeneratedColumn col) async {
    try {
      await m.addColumn(table, col as GeneratedColumn<Object>);
    } catch (e) {
      // Ignore 'duplicate column name' errors
      debugPrint('Migration: Column ${col.name} already exists, skipping: $e');
    }
  }

  /// Safely creates a table, silently ignoring the error if it already exists.
  Future<void> _safeCreateTable(Migrator m, TableInfo table) async {
    try {
      await m.createTable(table);
    } catch (e) {
      debugPrint('Migration: Table ${table.actualTableName} already exists, skipping: $e');
    }
  }
}
