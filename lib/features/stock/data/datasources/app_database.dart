import 'dart:typed_data';
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
import 'package:involve_app/features/school/data/models/school_tables.dart';

part 'app_database.g.dart';

@DriftDatabase(tables: [
  Items,
  Invoices,
  InvoiceItems,
  Settings,
  Categories,
  LicenseHistory,
  Staff,
  SyncMeta,
  StockIncrements,
  StockReturns,
  Expenses,
  AcademicYears,
  Terms,
  Classes,
  Students,
  BusinessSettings,
  Subjects,
  Results
])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(connection.connect());

  @override
  int get schemaVersion => 49;

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
        if (from < 33) {
          // Schema V33: Add FeeTypes table
          // await _safeCreateTable(m, feeTypes);
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
        if (from < 37) {
          // School Mode Migration
          await _safeAddColumn(m, settings, settings.businessMode);
          await _safeCreateTable(m, academicYears);
          await _safeCreateTable(m, terms);
          await _safeCreateTable(m, classes);
          // await _safeCreateTable(m, feeTypes);
          await _safeCreateTable(m, students);
        }
        if (from < 38) {
          // Extension for School Mode Invoices
          await _safeAddColumn(m, invoices, invoices.businessMode);
          await _safeAddColumn(m, invoices, invoices.studentId);
          await _safeAddColumn(m, invoices, invoices.classId);
          await _safeAddColumn(m, invoices, invoices.termId);
          await _safeAddColumn(m, invoices, invoices.academicYearId);
          
          // Separate Business Settings table
          await _safeCreateTable(m, businessSettings);
          
          // Seed initial business settings if needed
          await into(businessSettings).insert(BusinessSettingsCompanion(
            businessMode: const Value('retail'),
          ));
        }
        if (from < 39) {
          // Student Passport Photo Migration
          await _safeAddColumn(m, students, students.image);
        }

        if (from < 40) {
          // Schema V40: Add new Student fields and Category business mode
          await _safeAddColumn(m, students, students.dateOfBirth);
          await _safeAddColumn(m, students, students.registrationDate);
          await _safeAddColumn(m, categories, categories.businessMode);
        }

        if (from < 41) {
          // Schema V41: Enforce unique constraints on existing academic tables
          // AcademicYears: name unique
          // Terms: {academicYearId, name} unique
          // Students: admissionNumber unique
          await m.alterTable(TableMigration(academicYears));
          await m.alterTable(TableMigration(terms));
          await m.alterTable(TableMigration(students));
        }

        if (from < 42) {
          // Schema V42: Add businessMode to Items table
          await _safeAddColumn(m, items, items.businessMode);
        }

        if (from < 43) {
          // Schema V43: Enforce unique constraints on Classes and FeeTypes
          await m.alterTable(TableMigration(classes));
          // await m.alterTable(TableMigration(feeTypes));
        }
        
        if (from < 44) {
          // Schema V44: Add school display fields to Invoices table
          await _safeAddColumn(m, invoices, invoices.admissionNumber);
          await _safeAddColumn(m, invoices, invoices.className);
          await _safeAddColumn(m, invoices, invoices.termName);
          await _safeAddColumn(m, invoices, invoices.academicYearName);
        }

        if (from < 45) {
          // Schema V45: Add studentImage to Invoices table
          await _safeAddColumn(m, invoices, invoices.studentImage);
        }
        
        if (from < 46) {
          // Schema V46: Add menuOrder to Settings table
          await _safeAddColumn(m, settings, settings.menuOrder);
        }

        if (from < 47) {
          // Schema V47: Add sync columns to Students table
          await _safeAddColumn(m, students, students.syncId);
          await _safeAddColumn(m, students, students.updatedAt);
          await _safeAddColumn(m, students, students.createdAt);
          await _safeAddColumn(m, students, students.deviceId);
          await _safeAddColumn(m, students, students.isDeleted);
        }

        if (from < 48) {
          // Schema V48: Add Subjects and Results tables
          await _safeCreateTable(m, subjects);
          await _safeCreateTable(m, results);
        }

        if (from < 49) {
          // Schema V49: Add skipSplash and state persistence toggles
          await _safeAddColumn(m, settings, settings.skipSplash);
          await _safeAddColumn(m, settings, settings.restoreLastState);
          await _safeAddColumn(m, settings, settings.lastRoute);
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
      await m.addColumn(table, col);
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
