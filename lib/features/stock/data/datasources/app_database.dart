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

@DriftDatabase(tables: [Items, Invoices, InvoiceItems, Settings, Categories, LicenseHistory, Staff, SyncMeta])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(connection.connect());

  @override
  int get schemaVersion => 21;

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
          await m.addColumn(settings, settings.businessDescription);
        }
        if (from < 7) {
          // Price confirmation toggle migration
          await m.addColumn(settings, settings.confirmPriceOnSelection);
        }
        if (from < 8) {
          // License history migration
          await m.createTable(licenseHistory);
        }
        if (from < 9) {
          // Remove unique constraint from licenseId
          await m.deleteTable('license_history');
          await m.createTable(licenseHistory);
        }
        if (from < 10) {
          // Configurable tax rate migration
          await m.addColumn(settings, settings.taxRate);
        }
        if (from < 11) {
          // Account details migration
          await m.addColumn(settings, settings.bankName);
          await m.addColumn(settings, settings.accountNumber);
          await m.addColumn(settings, settings.accountName);
          await m.addColumn(settings, settings.showAccountDetails);
        }
        if (from < 12) {
          // Receipt footer migration
          await m.addColumn(settings, settings.receiptFooter);
        }
        if (from < 13) {
          // Signature space migration
          await m.addColumn(settings, settings.showSignatureSpace);
        }
        if (from < 14) {
          // Customer details migration
          await m.addColumn(invoices, invoices.customerName);
          await m.addColumn(invoices, invoices.customerAddress);
        }
        if (from < 15) {
          // Theme color migration
          await m.addColumn(settings, settings.primaryColor);
        }
        if (from < 16) {
          // Date/Time toggle migration
          await m.addColumn(settings, settings.showDateTime);
        }
        if (from < 17) {
          // Phase 3: Service Billing Migration
          await m.addColumn(settings, settings.serviceBillingEnabled);
          await m.addColumn(settings, settings.serviceTypes);
          await m.addColumn(items, items.type);
          await m.addColumn(items, items.billingType);
          await m.addColumn(items, items.serviceCategory);
          await m.addColumn(items, items.requiresTimeTracking);
          await m.addColumn(invoiceItems, invoiceItems.type);
          await m.addColumn(invoiceItems, invoiceItems.serviceMeta);
        }
        if (from < 18) {
          // Phase 4: Staff & Refinements
          await m.createTable(staff);
          await m.addColumn(settings, settings.staffManagementEnabled);
          await m.addColumn(settings, settings.paperWidth);
          await m.addColumn(settings, settings.halfDayStartHour);
          await m.addColumn(settings, settings.halfDayEndHour);
          await m.addColumn(invoices, invoices.staffId);
          await m.addColumn(invoices, invoices.staffName);
        }
        if (from < 19) {
          // Phase 5: Offline LAN Sync
          await _safeAddColumn(m, items, items.syncId);
          await _safeAddColumn(m, items, items.updatedAt);
          await _safeAddColumn(m, items, items.createdAt);
          await _safeAddColumn(m, items, items.deviceId);
          await _safeAddColumn(m, items, items.isDeleted);

          await _safeAddColumn(m, invoices, invoices.syncId);
          await _safeAddColumn(m, invoices, invoices.updatedAt);
          await _safeAddColumn(m, invoices, invoices.createdAt);
          await _safeAddColumn(m, invoices, invoices.deviceId);
          await _safeAddColumn(m, invoices, invoices.isDeleted);

          await _safeAddColumn(m, invoiceItems, invoiceItems.syncId);
          await _safeAddColumn(m, invoiceItems, invoiceItems.updatedAt);
          await _safeAddColumn(m, invoiceItems, invoiceItems.createdAt);
          await _safeAddColumn(m, invoiceItems, invoiceItems.deviceId);
          await _safeAddColumn(m, invoiceItems, invoiceItems.isDeleted);

          await _safeAddColumn(m, categories, categories.syncId);
          await _safeAddColumn(m, categories, categories.updatedAt);
          await _safeAddColumn(m, categories, categories.createdAt);
          await _safeAddColumn(m, categories, categories.deviceId);
          await _safeAddColumn(m, categories, categories.isDeleted);

          await _safeAddColumn(m, staff, staff.syncId);
          await _safeAddColumn(m, staff, staff.updatedAt);
          await _safeAddColumn(m, staff, staff.createdAt);
          await _safeAddColumn(m, staff, staff.deviceId);
          await _safeAddColumn(m, staff, staff.isDeleted);
        }
        if (from < 20) {
          // Phase 5: Offline LAN Sync - Meta
          await _safeCreateTable(m, syncMeta);
        }
        if (from < 21) {
          // Sync Status Toggle
          await _safeAddColumn(m, settings, settings.showSyncStatus);
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
}
