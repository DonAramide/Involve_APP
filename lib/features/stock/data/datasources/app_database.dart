import 'package:drift/drift.dart';
import 'connection_native.dart' if (dart.library.html) 'connection_web.dart' as connection;
import '../../../invoicing/data/models/invoice_table.dart';
import '../../../settings/data/models/settings_table.dart';
import '../models/item_table.dart';
import '../models/category_table.dart';
import '../../../../core/license/license_history_table.dart';

part 'app_database.g.dart';

@DriftDatabase(tables: [Items, Invoices, InvoiceItems, Settings, Categories, LicenseHistory])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(connection.connect());

  @override
  int get schemaVersion => 15;

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
        if (from < 8) {
          // License history migration
          await m.createTable(licenseHistory);
        }
        if (from < 9) {
          // Remove unique constraint from licenseId (sqlite doesn't support DROP CONSTRAINT)
          // Easiest dev-friendly way is to drop and recreate for this table specifically
          await m.deleteTable('license_history');
          await m.createTable(licenseHistory);
        }
        if (from < 10) {
          // Configurable tax rate migration
          await m.addColumn(settings, settings.taxRate);
        }
        if (from < 11) {
          // Account details migration
          await m.addColumn(settings, settings.bankName as GeneratedColumn<Object>);
          await m.addColumn(settings, settings.accountNumber as GeneratedColumn<Object>);
          await m.addColumn(settings, settings.accountName as GeneratedColumn<Object>);
          await m.addColumn(settings, settings.showAccountDetails as GeneratedColumn<Object>);
        }
        if (from < 12) {
          // Receipt footer migration
          await m.addColumn(settings, settings.receiptFooter as GeneratedColumn<Object>);
        }
        if (from < 13) {
          // Signature space migration
          await m.addColumn(settings, settings.showSignatureSpace as GeneratedColumn<Object>);
        }
        if (from < 14) {
          // Customer details migration
          await m.addColumn(invoices, invoices.customerName as GeneratedColumn<Object>);
          await m.addColumn(invoices, invoices.customerAddress as GeneratedColumn<Object>);
        }
        if (from < 15) {
          // Theme color migration
          await m.addColumn(settings, settings.primaryColor as GeneratedColumn<Object>);
        }
      },
      beforeOpen: (details) async {
        // Enforce Foreign Keys (SQLite only, harmless on Web/IndexedDB)
        await customStatement('PRAGMA foreign_keys = ON');
      },
    );
  }
}
