import 'package:drift/drift.dart';
import 'package:crypto/crypto.dart';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:involve_app/features/settings/data/models/staff_table.dart';
import 'connection_native.dart' if (dart.library.html) 'connection_web.dart' as connection;
import 'package:involve_app/features/invoicing/data/models/invoice_table.dart';
import 'package:involve_app/features/settings/data/models/settings_table.dart';
import 'package:involve_app/features/stock/data/models/item_table.dart';
import 'package:involve_app/features/stock/data/models/category_table.dart';
import 'package:involve_app/core/sync/data/models/sync_meta_table.dart';
import 'package:involve_app/core/license/license_history_table.dart';

import 'package:involve_app/features/stock/data/models/stock_return_table.dart';
import 'package:involve_app/features/stock/data/models/expense_table.dart';

part 'app_database.g.dart';

@DriftDatabase(tables: [Items, Invoices, InvoiceItems, Settings, Categories, LicenseHistory, Staff, SyncMeta, StockIncrements, StockReturns, Expenses])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(connection.connect());

  @override
  int get schemaVersion => 36;

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
        if (from < 29) {
          // Total Sales Card Toggle Migration
          await _safeAddColumn(m, settings, settings.showTotalSalesCard);
        }
        if (from < 30) {
          // Stock Returns Migration
          await _safeCreateTable(m, stockReturns);
        }
        if (from < 31) {
          // Return & Replace Toggle Migration
          await _safeAddColumn(m, settings, settings.stockReturnEnabled);
        }
        if (from < 32) {
          // Fix missing Return Stock columns in InvoiceItems
          await _safeAddColumn(m, invoiceItems, invoiceItems.returnedQuantity);
          await _safeAddColumn(m, invoiceItems, invoiceItems.isReplacement);
        }
        if (from < 33) {
          // Add Cost Price column
          await _safeAddColumn(m, items, items.costPrice);
        }
        if (from < 34) {
          // Add Expenses table
          await _safeCreateTable(m, expenses);
        }
        if (from < 35) {
          // Migration V35: Hash existing staff codes if they are still 4 characters (plaintext)
          // and allow longer codes in the schema.
          await m.alterTable(TableMigration(staff));

          final allStaff = await select(staff).get();
          for (final s in allStaff) {
            if (s.staffCode.length == 4) {
              final hashed = _hash(s.staffCode);
              await (update(staff)..where((tbl) => tbl.id.equals(s.id)))
                  .write(StaffCompanion(staffCode: Value(hashed)));
            }
          }
        }
        if (from < 36) {
          // Graph Visibility Toggles Migration
          await _safeAddColumn(m, settings, settings.showSalesTrendChart);
          await _safeAddColumn(m, settings, settings.showExpensePieChart);
          await _safeAddColumn(m, settings, settings.showTopSellingChart);
          await _safeAddColumn(m, settings, settings.showStockValueChart);
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

  String _hash(String input) {
    if (input.isEmpty) return "";
    const salt = "STAFF-PIN-INVIFY-2024-PROTECT";
    final bytes = utf8.encode(input + salt);
    return sha256.convert(bytes).toString();
  }
}
