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
import 'package:involve_app/features/printer/data/models/printer_table.dart';
import 'package:involve_app/features/services/data/models/services_tables.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';

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
  Results,
  GradingRules,
  Teachers,
  PrinterConfigs,
  Customers,
  ServiceJobs,
  ServicePayments,
  LocalCounters,
  ServiceJobPresets,
  ServiceMaterials,
  ServiceJobItems,
  ServiceMaterialCategories,
  ServiceLaborPresets,
  ServiceExpenseCategories,
  CurriculumMap,
  LessonNotes
])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(connection.connect());

  @override
  int get schemaVersion => 80;

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

        if (from < 50) {
          // Schema V50: Add GradingRules table
          await _safeCreateTable(m, gradingRules);
        }

        if (from < 51) {
          // Schema V51: Add Teachers table
          await _safeCreateTable(m, teachers);
        }

        if (from < 52) {
          // Schema V52: Add teacherId to Subjects table
          await _safeAddColumn(m, subjects, subjects.teacherId);
        }

        if (from < 53) {
          // Schema V53: Add employmentDate to Teachers table
          await _safeAddColumn(m, teachers, teachers.employmentDate);
        }

        if (from < 54) {
          // Schema V54: Add isDefault to Items table
          await _safeAddColumn(m, items, items.isDefault);
        }

        if (from < 55) {
          // Schema V55: Add showLogoAsMenuBackground to Settings table
          await _safeAddColumn(m, settings, settings.showLogoAsMenuBackground);
        }
        if (from < 56) {
          // Schema V56: Add currencyName and currencySubunit to Settings table
          await _safeAddColumn(m, settings, settings.currencySubunit);
        }
        if (from < 57) {
          // Schema V57: Add phone to Staff table
          await _safeAddColumn(m, staff, staff.phone);
        }
        if (from < 58) {
          // Schema V58: Add discountType to Invoices table
          await _safeAddColumn(m, invoices, invoices.discountType);
        }
        if (from < 59) {
          // Schema V59: Add logoSvg to Settings table
          await _safeAddColumn(m, settings, settings.logoSvg);
        }
        if (from < 60) {
          // Schema V60: Add PrinterConfigs table for renaming and auto-connect
          await _safeCreateTable(m, printerConfigs);
        }
        if (from < 61) {
          // Schema V61: Add adminSignature and showAdminSignature to Settings table
          await _safeAddColumn(m, settings, settings.adminSignature);
          await _safeAddColumn(m, settings, settings.showAdminSignature);
        }
        if (from < 62) {
          // Schema V62: Add staffId to Staff table
          await _safeAddColumn(m, staff, staff.staffId);
        }
        if (from < 63) {
          // Schema V63: Add academicYearId to Students table
          await _safeAddColumn(m, students, students.academicYearId);
        }
        if (from < 64) {
          // Schema V64: Add Services Module tables
          await _safeCreateTable(m, customers);
          await _safeCreateTable(m, serviceJobs);
          await _safeCreateTable(m, servicePayments);
          await _safeCreateTable(m, localCounters);
        }
        if (from < 65) {
          // Schema V65: Add ServiceJobPresets table
          await _safeCreateTable(m, serviceJobPresets);
        }
        if (from < 66) {
          // Schema V66: Add Materials and Labors tables
          await _safeCreateTable(m, serviceMaterials);
          await _safeCreateTable(m, serviceJobItems);
          await _safeAddColumn(m, serviceJobs, serviceJobs.laborAmount);
        }
        if (from < 67) {
          // Schema V67: Add ServiceMaterialCategories table
          await _safeCreateTable(m, serviceMaterialCategories);
        }
        if (from < 68) {
          // Schema V68: Add address/image to customers and create LaborPresets table
          await _safeAddColumn(m, customers, customers.address);
          await _safeAddColumn(m, customers, customers.image);
          await _safeCreateTable(m, serviceLaborPresets);
        }
        if (from < 69) {
          // Schema V69: Add ServiceExpenseCategories table
          await _safeCreateTable(m, serviceExpenseCategories);
        }
        if (from < 70) {
          // Schema V70: Add CurriculumMap table
          await _safeCreateTable(m, curriculumMap);
        }
        if (from < 71) {
          // Schema V71: Add LessonNotes table
          await _safeCreateTable(m, lessonNotes);
        }
        if (from < 72) {
          // Schema V72: Ensure indexes for LessonNotes and CurriculumMap
          // Index creation is handled in the table definition or via createIndex,
          // but we previously had geminiApiKey here.
        }
        if (from < 73) {
          // Schema V73: Harden LessonNotes with sync status, retry, and soft delete
          await transaction(() async {
            await _safeAddColumn(m, lessonNotes, lessonNotes.syncStatus);
            await _safeAddColumn(m, lessonNotes, lessonNotes.syncId);
            await _safeAddColumn(m, lessonNotes, lessonNotes.retryCount);
            await _safeAddColumn(m, lessonNotes, lessonNotes.isDeleted);
            await _safeAddColumn(m, lessonNotes, lessonNotes.deviceId);

            // Force create indices safely
            await _safeCreateIndex(m, Index('idx_lesson_sync_status', 'sync_status'));
            await _safeCreateIndex(m, Index('idx_lesson_deleted', 'is_deleted'));
            await _safeCreateIndex(m, Index('idx_lesson_sync_id', 'sync_id'));

            // Migrate existing data (Idempotent backfill)
            final sec = SecurityService();
            final persistentDeviceId = await sec.getPersistentDeviceId();
            
            final needsBackfill = await (select(lessonNotes)
                  ..where((t) => t.syncId.isNull() | t.deviceId.isNull()))
                .get();
                
            for (final lesson in needsBackfill) {
              final deterministicSyncId = '${lesson.contentHash}-v${lesson.version}';
              
              await (update(lessonNotes)..where((t) => t.id.equals(lesson.id)))
                  .write(LessonNotesCompanion(
                    syncId: Value(deterministicSyncId),
                    deviceId: Value(persistentDeviceId),
                    syncStatus: const Value(0), // Default to pending
                  ));
            }
          });
        }
        
        if (from < 74) {
          // Schema V74: Add syncStatus to ServiceCustomers
          await _safeAddColumn(m, customers, customers.syncStatus);
        }
        if (from < 75) {
          // Schema V75: Add syncStatus to ServiceJobs
          await _safeAddColumn(m, serviceJobs, serviceJobs.syncStatus);
        }
        if (from < 76) {
          // Schema V76: Add syncStatus to ServicePayments
          await _safeAddColumn(m, servicePayments, servicePayments.syncStatus);
        }
        if (from < 77) {
          // Schema V77: Add warranty support columns
          await _safeAddColumn(m, settings, settings.warrantyEnabled);
          await _safeAddColumn(m, invoices, invoices.warrantyDuration);
          await _safeAddColumn(m, serviceJobs, serviceJobs.warrantyDuration);
        }
        if (from < 78) {
          // Schema V78: Add role to Staff table
          await _safeAddColumn(m, staff, staff.role);
        }
        if (from < 79) {
          // Schema V79: Rename ServiceCustomers to Customers, add Virtual Accounts and Balances
          // Drift's renameTable is tricky when we also renamed the accessor, so we just recreate/alter.
          // By adding columns using _safeAddColumn, it'll apply to the table mapped to `customers`.
          // If the table was previously `service_customers`, drift handles rename via TableMigration if configured,
          // but we can just use _safeCreateTable to ensure `customers` exists and add columns.
          await _safeCreateTable(m, customers);
          await _safeAddColumn(m, customers, customers.balance);
          await _safeAddColumn(m, customers, customers.virtualAccountNumber);
          await _safeAddColumn(m, customers, customers.virtualAccountName);
          await _safeAddColumn(m, customers, customers.virtualAccountBank);
        }
        if (from < 80) {
          // Schema V80: Add virtual account fields and creditBalance to Students table
          await _safeAddColumn(m, students, students.creditBalance);
          await _safeAddColumn(m, students, students.virtualAccountNumber);
          await _safeAddColumn(m, students, students.virtualAccountBank);
          await _safeAddColumn(m, students, students.virtualAccountStatus);
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
  Future<void> _safeAddColumn(Migrator m, TableInfo table, dynamic col) async {
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

  /// Safely creates an index, silently ignoring the error if it already exists.
  Future<void> _safeCreateIndex(Migrator m, Index index) async {
    try {
      await m.createIndex(index);
    } catch (e) {
      debugPrint('Migration: Index already exists, skipping: $e');
    }
  }

  String _hash(String input) {
    if (input.isEmpty) return "";
    const salt = "STAFF-PIN-INVIFY-2024-PROTECT";
    final bytes = utf8.encode(input + salt);
    return sha256.convert(bytes).toString();
  }
}
