import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:drift/drift.dart';
import 'package:sqlite3/sqlite3.dart' as sqlite;
import 'package:sqlite3_flutter_libs/sqlite3_flutter_libs.dart';

Future<bool> performSync(AppDatabase database, Uint8List backupBytes) async {
  File? tempFile;
  try {
    // 1. Write bytes to a temporary file
    final tempDir = await getTemporaryDirectory();
    tempFile = File(p.join(tempDir.path, 'temp_sync_${DateTime.now().millisecondsSinceEpoch}.sqlite'));
    await tempFile.writeAsBytes(backupBytes);

    // 2. Open temporary database
    final backupDb = sqlite.sqlite3.open(tempFile.path);
    
    try {
      await database.transaction(() async {
        // --- Staff Sync ---
        debugPrint('Syncing Staff...');
        final Map<int, int> staffIdMap = {}; // oldId -> newId
        if (_tableExists(backupDb, 'staff')) {
          final backupStaff = backupDb.select('SELECT * FROM staff');
          for (final row in backupStaff) {
            final oldId = row['id'] as int;
            final syncId = _getString(row['sync_id']);
            final name = _getString(row['name']) ?? '';

            StaffTable? existing;
            if (syncId != null) {
              existing = await (database.select(database.staff)..where((s) => s.syncId.equals(syncId))).getSingleOrNull();
            }
            existing ??= await (database.select(database.staff)..where((s) => s.name.equals(name))).getSingleOrNull();

            if (existing != null) {
              staffIdMap[oldId] = existing.id;
              final incomingUpdate = _getDateTime(row['updated_at']);
              if (incomingUpdate != null && (existing.updatedAt == null || incomingUpdate.isAfter(existing.updatedAt!))) {
                await (database.update(database.staff)..where((s) => s.id.equals(existing!.id))).write(
                  StaffCompanion(
                    name: Value(name),
                    staffCode: Value(_getString(row['staff_code']) ?? ''),
                    isActive: Value(row['is_active'] == 1),
                    updatedAt: Value(incomingUpdate),
                  )
                );
              }
            } else {
              final newId = await database.into(database.staff).insert(
                StaffCompanion.insert(
                  name: name,
                  staffCode: _getString(row['staff_code']) ?? '',
                  isActive: Value(row['is_active'] == 1),
                  syncId: Value(syncId),
                  updatedAt: Value(_getDateTime(row['updated_at'])),
                  createdAt: Value(_getDateTime(row['created_at'])),
                )
              );
              staffIdMap[oldId] = newId;
            }
          }
        }

        // --- Category Sync ---
        debugPrint('Syncing Categories...');
        final Map<int, int> categoryIdMap = {}; 
        if (_tableExists(backupDb, 'categories')) {
          final backupCategories = backupDb.select('SELECT * FROM categories');
          for (final row in backupCategories) {
            final oldId = row['id'] as int;
            final name = _getString(row['name']) ?? '';
            final syncId = _getString(row['sync_id']); 

            CategoryTable? existing;
            if (syncId != null) {
              existing = await (database.select(database.categories)..where((c) => c.syncId.equals(syncId))).getSingleOrNull();
            }
            existing ??= await (database.select(database.categories)..where((c) => c.name.equals(name))).getSingleOrNull();
            
            if (existing != null) {
              categoryIdMap[oldId] = existing.id;
            } else {
              final newId = await database.into(database.categories).insert(
                CategoriesCompanion.insert(
                  name: name,
                  syncId: Value(syncId),
                )
              );
              categoryIdMap[oldId] = newId;
            }
          }
        }

        // --- Item Sync ---
        debugPrint('Syncing Items...');
        final Map<int, int> itemIdMap = {}; 
        if (_tableExists(backupDb, 'items')) {
          final backupItems = backupDb.select('SELECT * FROM items');
          for (final row in backupItems) {
            final oldId = row['id'] as int;
            final name = _getString(row['name']) ?? '';
            final syncId = _getString(row['sync_id']);
            final oldCategoryId = row['category_id'] as int?;
            final newCategoryId = oldCategoryId != null ? categoryIdMap[oldCategoryId] : null;

            ItemTable? existing;
            if (syncId != null) {
              existing = await (database.select(database.items)..where((i) => i.syncId.equals(syncId))).getSingleOrNull();
            }
            existing ??= await (database.select(database.items)..where((i) => i.name.equals(name))).getSingleOrNull();
            
            if (existing != null) {
              itemIdMap[oldId] = existing.id;
              final incomingUpdate = _getDateTime(row['updated_at']);
              if (incomingUpdate != null && (existing.updatedAt == null || incomingUpdate.isAfter(existing.updatedAt!))) {
                await (database.update(database.items)..where((i) => i.id.equals(existing!.id))).write(
                  ItemsCompanion(
                    price: Value((row['price'] as num).toDouble()),
                    costPrice: Value((row['cost_price'] as num?)?.toDouble() ?? 0.0),
                    stockQty: Value(row['stock_qty'] as int),
                    minStockQty: Value((row['min_stock_qty'] as num?)?.toDouble() ?? 0.0),
                    image: Value(row['image'] as Uint8List?),
                    categoryId: Value(newCategoryId),
                    updatedAt: Value(incomingUpdate),
                  )
                );
              }
            } else {
              final newId = await database.into(database.items).insert(
                ItemsCompanion.insert(
                  name: name,
                  category: _getString(row['category']) ?? 'General',
                  price: (row['price'] as num).toDouble(),
                  costPrice: Value((row['cost_price'] as num?)?.toDouble() ?? 0.0),
                  stockQty: Value(row['stock_qty'] as int),
                  minStockQty: Value((row['min_stock_qty'] as num?)?.toDouble() ?? 0.0),
                  image: Value(row['image'] as Uint8List?),
                  categoryId: Value(newCategoryId),
                  syncId: Value(syncId),
                  createdAt: Value(_getDateTime(row['created_at'])),
                  updatedAt: Value(_getDateTime(row['updated_at'])),
                )
              );
              itemIdMap[oldId] = newId;
            }
          }
        }

        // --- Academic Year Sync ---
        debugPrint('Syncing Academic Years...');
        final Map<int, int> academicYearIdMap = {};
        if (_tableExists(backupDb, 'academic_years')) {
          final backupYears = backupDb.select('SELECT * FROM academic_years');
          for (final row in backupYears) {
            final oldId = row['id'] as int;
            final name = _getString(row['name']) ?? '';
            final syncId = _getString(row['sync_id']);

            AcademicYearTable? existing;
            if (syncId != null) {
              existing = await (database.select(database.academicYears)..where((y) => y.syncId.equals(syncId))).getSingleOrNull();
            }
            existing ??= await (database.select(database.academicYears)..where((y) => y.name.equals(name))).getSingleOrNull();

            if (existing != null) {
              academicYearIdMap[oldId] = existing.id;
            } else {
              final newId = await database.into(database.academicYears).insert(
                AcademicYearsCompanion.insert(
                  name: name,
                  startDate: _getDateTime(row['start_date']) ?? DateTime.now(),
                  endDate: _getDateTime(row['end_date']) ?? DateTime.now(),
                  isCurrent: Value(row['is_current'] == 1),
                  syncId: Value(syncId),
                  updatedAt: Value(_getDateTime(row['updated_at'])),
                  createdAt: Value(_getDateTime(row['created_at'])),
                )
              );
              academicYearIdMap[oldId] = newId;
            }
          }
        }

        // --- Terms Sync ---
        debugPrint('Syncing Terms...');
        final Map<int, int> termIdMap = {};
        if (_tableExists(backupDb, 'terms')) {
          final backupTerms = backupDb.select('SELECT * FROM terms');
          for (final row in backupTerms) {
            final oldId = row['id'] as int;
            final name = _getString(row['name']) ?? '';
            final syncId = _getString(row['sync_id']);
            final oldYearId = row['academic_year_id'] as int;
            final newYearId = academicYearIdMap[oldYearId];

            if (newYearId != null) {
              TermTable? existing;
              if (syncId != null) {
                existing = await (database.select(database.terms)..where((t) => t.syncId.equals(syncId))).getSingleOrNull();
              }
              existing ??= await (database.select(database.terms)..where((t) => t.name.equals(name) & t.academicYearId.equals(newYearId))).getSingleOrNull();

              if (existing != null) {
                termIdMap[oldId] = existing.id;
              } else {
                final newId = await database.into(database.terms).insert(
                  TermsCompanion.insert(
                    academicYearId: newYearId,
                    name: name,
                    startDate: _getDateTime(row['start_date']) ?? DateTime.now(),
                    endDate: _getDateTime(row['end_date']) ?? DateTime.now(),
                    isCurrent: Value(row['is_current'] == 1),
                    syncId: Value(syncId),
                    updatedAt: Value(_getDateTime(row['updated_at'])),
                    createdAt: Value(_getDateTime(row['created_at'])),
                  )
                );
                termIdMap[oldId] = newId;
              }
            }
          }
        }

        // --- Class Sync ---
        debugPrint('Syncing Classes...');
        final Map<int, int> classIdMap = {};
        if (_tableExists(backupDb, 'classes')) {
          final backupClasses = backupDb.select('SELECT * FROM classes');
          for (final row in backupClasses) {
            final oldId = row['id'] as int;
            final name = _getString(row['name']) ?? '';
            final syncId = _getString(row['sync_id']);

            ClassTable? existing;
            if (syncId != null) {
              existing = await (database.select(database.classes)..where((c) => c.syncId.equals(syncId))).getSingleOrNull();
            }
            existing ??= await (database.select(database.classes)..where((c) => c.name.equals(name))).getSingleOrNull();

            if (existing != null) {
              classIdMap[oldId] = existing.id;
            } else {
              final newId = await database.into(database.classes).insert(
                ClassesCompanion.insert(
                  name: name,
                  description: Value(_getString(row['description'])),
                  syncId: Value(syncId),
                  updatedAt: Value(_getDateTime(row['updated_at'])),
                  createdAt: Value(_getDateTime(row['created_at'])),
                )
              );
              classIdMap[oldId] = newId;
            }
          }
        }

        // --- Teacher Sync ---
        debugPrint('Syncing Teachers...');
        final Map<int, int> teacherIdMap = {};
        if (_tableExists(backupDb, 'teachers')) {
          final backupTeachers = backupDb.select('SELECT * FROM teachers');
          for (final row in backupTeachers) {
            final oldId = row['id'] as int;
            final fullName = _getString(row['full_name']) ?? '';
            final syncId = _getString(row['sync_id']);
            final oldClassId = row['class_id'] as int?;
            final newClassId = oldClassId != null ? classIdMap[oldClassId] : null;

            TeacherTable? existing;
            if (syncId != null) {
              existing = await (database.select(database.teachers)..where((t) => t.syncId.equals(syncId))).getSingleOrNull();
            }
            existing ??= await (database.select(database.teachers)..where((t) => t.fullName.equals(fullName))).getSingleOrNull();

            if (existing != null) {
              teacherIdMap[oldId] = existing.id;
            } else {
              final newId = await database.into(database.teachers).insert(
                TeachersCompanion.insert(
                  fullName: fullName,
                  phone: Value(_getString(row['phone'])),
                  profession: Value(_getString(row['profession'])),
                  classId: Value(newClassId),
                  salary: Value((row['salary'] as num?)?.toDouble() ?? 0.0),
                  yearsInSchool: Value(row['years_in_school'] as int? ?? 0),
                  employmentDate: Value(_getDateTime(row['employment_date']) ?? DateTime.now()),
                  certificates: Value(_getString(row['certificates'])),
                  image: Value(row['image'] as Uint8List?),
                  syncId: Value(syncId),
                  updatedAt: Value(_getDateTime(row['updated_at'])),
                  createdAt: Value(_getDateTime(row['created_at'])),
                )
              );
              teacherIdMap[oldId] = newId;
            }
          }
        }

        // --- Student Sync ---
        debugPrint('Syncing Students...');
        final Map<int, int> studentIdMap = {};
        if (_tableExists(backupDb, 'students')) {
          final backupStudents = backupDb.select('SELECT * FROM students');
          for (final row in backupStudents) {
            final oldId = row['id'] as int;
            final admissionNumber = _getString(row['admission_number']) ?? '';
            final syncId = _getString(row['sync_id']);
            final oldClassId = row['class_id'] as int;
            final newClassId = classIdMap[oldClassId];
            final oldYearId = row['academic_year_id'] as int?;
            final newYearId = oldYearId != null ? academicYearIdMap[oldYearId] : null;

            if (newClassId != null) {
              StudentTable? existing;
              if (syncId != null) {
                existing = await (database.select(database.students)..where((s) => s.syncId.equals(syncId))).getSingleOrNull();
              }
              existing ??= await (database.select(database.students)..where((s) => s.admissionNumber.equals(admissionNumber))).getSingleOrNull();

              if (existing != null) {
                studentIdMap[oldId] = existing.id;
                final incomingUpdate = _getDateTime(row['updated_at']);
                if (incomingUpdate != null && (existing.updatedAt == null || incomingUpdate.isAfter(existing.updatedAt!))) {
                  await (database.update(database.students)..where((s) => s.id.equals(existing!.id))).write(
                    StudentsCompanion(
                      balance: Value((row['balance'] as num?)?.toDouble() ?? 0.0),
                      classId: Value(newClassId),
                      parentName: Value(_getString(row['parent_name'])),
                      parentPhone: Value(_getString(row['parent_phone'])),
                      updatedAt: Value(incomingUpdate),
                    )
                  );
                }
              } else {
                final newId = await database.into(database.students).insert(
                  StudentsCompanion.insert(
                    admissionNumber: admissionNumber,
                    firstName: _getString(row['first_name']) ?? '',
                    lastName: _getString(row['last_name']) ?? '',
                    classId: newClassId,
                    academicYearId: Value(newYearId),
                    parentName: Value(_getString(row['parent_name'])),
                    parentPhone: Value(_getString(row['parent_phone'])),
                    balance: Value((row['balance'] as num?)?.toDouble() ?? 0.0),
                    gender: Value(_getString(row['gender'])),
                    dateOfBirth: Value(_getDateTime(row['date_of_birth'])),
                    registrationDate: Value(_getDateTime(row['registration_date']) ?? DateTime.now()),
                    image: Value(row['image'] as Uint8List?),
                    syncId: Value(syncId),
                    updatedAt: Value(_getDateTime(row['updated_at'])),
                    createdAt: Value(_getDateTime(row['created_at'])),
                  )
                );
                studentIdMap[oldId] = newId;
              }
            }
          }
        }

        // --- Subject Sync ---
        debugPrint('Syncing Subjects...');
        final Map<int, int> subjectIdMap = {};
        if (_tableExists(backupDb, 'subjects')) {
          final backupSubjects = backupDb.select('SELECT * FROM subjects');
          for (final row in backupSubjects) {
            final oldId = row['id'] as int;
            final name = _getString(row['name']) ?? '';
            final syncId = _getString(row['sync_id']);
            final oldTeacherId = row['teacher_id'] as int?;
            final newTeacherId = oldTeacherId != null ? teacherIdMap[oldTeacherId] : null;

            SubjectTable? existing;
            if (syncId != null) {
              existing = await (database.select(database.subjects)..where((s) => s.syncId.equals(syncId))).getSingleOrNull();
            }
            existing ??= await (database.select(database.subjects)..where((s) => s.name.equals(name))).getSingleOrNull();

            if (existing != null) {
              subjectIdMap[oldId] = existing.id;
            } else {
              final newId = await database.into(database.subjects).insert(
                SubjectsCompanion.insert(
                  name: name,
                  code: Value(_getString(row['code'])),
                  teacherId: Value(newTeacherId),
                  syncId: Value(syncId),
                  updatedAt: Value(_getDateTime(row['updated_at'])),
                  createdAt: Value(_getDateTime(row['created_at'])),
                )
              );
              subjectIdMap[oldId] = newId;
            }
          }
        }

        // --- Result Sync ---
        debugPrint('Syncing Results...');
        if (_tableExists(backupDb, 'results')) {
          final backupResults = backupDb.select('SELECT * FROM results');
          for (final row in backupResults) {
            final oldStudentId = row['student_id'] as int;
            final oldSubjectId = row['subject_id'] as int;
            final oldTermId = row['term_id'] as int;
            final oldYearId = row['academic_year_id'] as int;
            final syncId = _getString(row['sync_id']);

            final newStudentId = studentIdMap[oldStudentId];
            final newSubjectId = subjectIdMap[oldSubjectId];
            final newTermId = termIdMap[oldTermId];
            final newYearId = academicYearIdMap[oldYearId];

            if (newStudentId != null && newSubjectId != null && newTermId != null && newYearId != null) {
              ResultTable? existing;
              if (syncId != null) {
                existing = await (database.select(database.results)..where((r) => r.syncId.equals(syncId))).getSingleOrNull();
              }
              existing ??= await (database.select(database.results)..where((r) => 
                r.studentId.equals(newStudentId) & 
                r.subjectId.equals(newSubjectId) & 
                r.termId.equals(newTermId) & 
                r.academicYearId.equals(newYearId)
              )).getSingleOrNull();

              if (existing == null) {
                await database.into(database.results).insert(
                  ResultsCompanion.insert(
                    studentId: newStudentId,
                    subjectId: newSubjectId,
                    termId: newTermId,
                    academicYearId: newYearId,
                    assessmentScore: Value((row['assessment_score'] as num?)?.toDouble() ?? 0.0),
                    examScore: Value((row['exam_score'] as num?)?.toDouble() ?? 0.0),
                    totalScore: Value((row['total_score'] as num?)?.toDouble() ?? 0.0),
                    grade: Value(_getString(row['grade'])),
                    remarks: Value(_getString(row['remarks'])),
                    dateEntered: Value(_getDateTime(row['date_entered']) ?? DateTime.now()),
                    syncId: Value(syncId),
                    updatedAt: Value(_getDateTime(row['updated_at'])),
                    createdAt: Value(_getDateTime(row['created_at'])),
                  )
                );
              }
            }
          }
        }

        // --- Grading Rules Sync ---
        debugPrint('Syncing Grading Rules...');
        if (_tableExists(backupDb, 'grading_rules')) {
          final backupRules = backupDb.select('SELECT * FROM grading_rules');
          for (final row in backupRules) {
            final syncId = _getString(row['sync_id']);
            final grade = _getString(row['grade']) ?? '';

            GradingRuleTable? existing;
            if (syncId != null) {
              existing = await (database.select(database.gradingRules)..where((gr) => gr.syncId.equals(syncId))).getSingleOrNull();
            }
            existing ??= await (database.select(database.gradingRules)..where((gr) => gr.grade.equals(grade))).getSingleOrNull();

            if (existing == null) {
              await database.into(database.gradingRules).insert(
                GradingRulesCompanion.insert(
                  minScore: (row['min_score'] as num).toDouble(),
                  maxScore: (row['max_score'] as num).toDouble(),
                  grade: grade,
                  remarks: Value(_getString(row['remarks'])),
                  syncId: Value(syncId),
                  updatedAt: Value(_getDateTime(row['updated_at'])),
                  createdAt: Value(_getDateTime(row['created_at'])),
                )
              );
            }
          }
        }

        // --- Invoice Sync ---
        debugPrint('Syncing Invoices...');
        final Map<int, int> invoiceIdMap = {}; 
        if (_tableExists(backupDb, 'invoices')) {
          final backupInvoices = backupDb.select('SELECT * FROM invoices');
          for (final row in backupInvoices) {
            final oldId = row['id'] as int;
            final invoiceNumber = _getString(row['invoice_number']) ?? '';
            final syncId = _getString(row['sync_id']);
            
            final oldStaffId = row['staff_id'] as int?;
            final newStaffId = oldStaffId != null ? staffIdMap[oldStaffId] : null;

            final oldStudentId = row['student_id'] as int?;
            final newStudentId = oldStudentId != null ? studentIdMap[oldStudentId] : null;
            final oldClassId = row['class_id'] as int?;
            final newClassId = oldClassId != null ? classIdMap[oldClassId] : null;
            final oldTermId = row['term_id'] as int?;
            final newTermId = oldTermId != null ? termIdMap[oldTermId] : null;
            final oldYearId = row['academic_year_id'] as int?;
            final newYearId = oldYearId != null ? academicYearIdMap[oldYearId] : null;

            InvoiceTable? existing;
            if (syncId != null) {
              existing = await (database.select(database.invoices)..where((inv) => inv.syncId.equals(syncId))).getSingleOrNull();
            }
            existing ??= await (database.select(database.invoices)..where((inv) => inv.invoiceNumber.equals(invoiceNumber))).getSingleOrNull();
            
            if (existing != null) {
              invoiceIdMap[oldId] = existing.id;
              final incomingUpdate = _getDateTime(row['updated_at']);
              if (incomingUpdate != null && (existing.updatedAt == null || incomingUpdate.isAfter(existing.updatedAt!))) {
                await (database.update(database.invoices)..where((inv) => inv.id.equals(existing!.id))).write(
                  InvoicesCompanion(
                    paymentStatus: Value(_getString(row['payment_status']) ?? 'Unpaid'),
                    amountPaid: Value((row['amount_paid'] as num).toDouble()),
                    balanceAmount: Value((row['balance_amount'] as num).toDouble()),
                    studentId: Value(newStudentId),
                    classId: Value(newClassId),
                    termId: Value(newTermId),
                    academicYearId: Value(newYearId),
                    updatedAt: Value(incomingUpdate),
                  )
                );
              }
            } else {
              final newId = await database.into(database.invoices).insert(
                InvoicesCompanion.insert(
                  invoiceNumber: invoiceNumber,
                  subtotal: (row['subtotal'] as num).toDouble(),
                  taxAmount: (row['tax_amount'] as num).toDouble(),
                  discountAmount: (row['discount_amount'] as num).toDouble(),
                  totalAmount: (row['total_amount'] as num).toDouble(),
                  paymentStatus: _getString(row['payment_status']) ?? 'Unpaid',
                  dateCreated: Value(_getDateTime(row['date_created']) ?? DateTime.now()),
                  amountPaid: Value((row['amount_paid'] as num).toDouble()),
                  balanceAmount: Value((row['balance_amount'] as num).toDouble()),
                  customerName: Value(_getString(row['customer_name'])),
                  customerAddress: Value(_getString(row['customer_address'])),
                  paymentMethod: Value(_getString(row['payment_method'])),
                  staffId: Value(newStaffId),
                  staffName: Value(_getString(row['staff_name'])),
                  studentId: Value(newStudentId),
                  classId: Value(newClassId),
                  termId: Value(newTermId),
                  academicYearId: Value(newYearId),
                  businessMode: Value(_getString(row['business_mode']) ?? 'retail'),
                  admissionNumber: Value(_getString(row['admission_number'])),
                  className: Value(_getString(row['class_name'])),
                  termName: Value(_getString(row['term_name'])),
                  academicYearName: Value(_getString(row['academic_year_name'])),
                  syncId: Value(syncId),
                  createdAt: Value(_getDateTime(row['created_at'])),
                  updatedAt: Value(_getDateTime(row['updated_at'])),
                  totalPrintAmount: Value((row['total_print_amount'] as num?)?.toDouble()),
                )
              );
              invoiceIdMap[oldId] = newId;
            }

            // --- Invoice Items Sync ---
            if (_tableExists(backupDb, 'invoice_items')) {
              final backupInvItems = backupDb.select('SELECT * FROM invoice_items WHERE invoice_id = ?', [oldId]);
              for (final itemRow in backupInvItems) {
                final oldItemId = itemRow['item_id'] as int;
                final newItemId = itemIdMap[oldItemId];
                final iSyncId = _getString(itemRow['sync_id']);
                
                if (newItemId != null) {
                  InvoiceItemTable? existingItem;
                  if (iSyncId != null) {
                    existingItem = await (database.select(database.invoiceItems)..where((ii) => ii.syncId.equals(iSyncId))).getSingleOrNull();
                  }
                  
                  if (existingItem == null) {
                    await database.into(database.invoiceItems).insert(
                      InvoiceItemsCompanion.insert(
                        invoiceId: invoiceIdMap[oldId]!,
                        itemId: newItemId,
                        quantity: itemRow['quantity'] as int,
                        unitPrice: (itemRow['unit_price'] as num).toDouble(),
                        type: Value(_getString(itemRow['type']) ?? 'product'),
                        serviceMeta: Value(_getString(itemRow['service_meta'])),
                        syncId: Value(iSyncId),
                        createdAt: Value(_getDateTime(itemRow['created_at'])),
                        updatedAt: Value(_getDateTime(itemRow['updated_at'])),
                        printPrice: Value((itemRow['print_price'] as num?)?.toDouble()),
                        returnedQuantity: Value(itemRow['returned_quantity'] as int),
                        isReplacement: Value(itemRow['is_replacement'] == 1),
                      )
                    );
                  }
                }
              }
            }
          }
        }

        // --- Stock Returns Sync ---
        debugPrint('Syncing Stock Returns...');
        if (_tableExists(backupDb, 'stock_returns')) {
          final backupReturns = backupDb.select('SELECT * FROM stock_returns');
          for (final row in backupReturns) {
            final syncId = _getString(row['sync_id']);
            final oldInvoiceId = row['invoice_id'] as int;
            final oldItemId = row['item_id'] as int;
            
            final newInvoiceId = invoiceIdMap[oldInvoiceId];
            final newItemId = itemIdMap[oldItemId];

            if (newInvoiceId != null && newItemId != null) {
              StockReturnTable? existing;
              if (syncId != null) {
                existing = await (database.select(database.stockReturns)..where((sr) => sr.syncId.equals(syncId))).getSingleOrNull();
              }

              if (existing == null) {
                final oldStaffId = row['staff_id'] as int?;
                final newStaffId = oldStaffId != null ? staffIdMap[oldStaffId] : null;

                await database.into(database.stockReturns).insert(
                  StockReturnsCompanion.insert(
                    invoiceId: newInvoiceId,
                    itemId: newItemId,
                    quantity: row['quantity'] as int,
                    amountReturned: (row['amount_returned'] as num?)?.toDouble() ?? 0.0,
                    staffId: newStaffId ?? 0, 
                    dateReturned: Value(_getDateTime(row['date_returned']) ?? DateTime.now()),
                    syncId: Value(syncId),
                    createdAt: Value(_getDateTime(row['created_at'])),
                    updatedAt: Value(_getDateTime(row['updated_at'])),
                  )
                );
              }
            }
          }
        }

        // --- Expense Sync ---
        debugPrint('Syncing Expenses...');
        if (_tableExists(backupDb, 'expenses')) {
          final backupExpenses = backupDb.select('SELECT * FROM expenses');
          for (final row in backupExpenses) {
            final syncId = _getString(row['sync_id']);
            
            ExpenseTable? existing;
            if (syncId != null) {
              existing = await (database.select(database.expenses)..where((e) => e.syncId.equals(syncId))).getSingleOrNull();
            }

            if (existing == null) {
              await database.into(database.expenses).insert(
                ExpensesCompanion.insert(
                  amount: (row['amount'] as num).toDouble(),
                  description: _getString(row['description']) ?? '',
                  category: Value(_getString(row['category'])),
                  date: Value(_getDateTime(row['date']) ?? DateTime.now()),
                  syncId: Value(syncId),
                  createdAt: Value(_getDateTime(row['created_at'])),
                  updatedAt: Value(_getDateTime(row['updated_at'])),
                )
              );
            }
          }
        }

        // --- Stock Increments Sync ---
        debugPrint('Syncing Stock Increments...');
        if (_tableExists(backupDb, 'stock_increments')) {
          final backupIncrements = backupDb.select('SELECT * FROM stock_increments');
          for (final row in backupIncrements) {
            final syncId = _getString(row['sync_id']);
            final oldItemId = row['item_id'] as int;
            final newItemId = itemIdMap[oldItemId];

            if (newItemId != null) {
              StockIncrementTable? existing;
              if (syncId != null) {
                existing = await (database.select(database.stockIncrements)..where((si) => si.syncId.equals(syncId))).getSingleOrNull();
              }

              if (existing == null) {
                await database.into(database.stockIncrements).insert(
                  StockIncrementsCompanion.insert(
                    itemId: newItemId,
                    quantityAdded: row['quantity_added'] as int,
                    quantityBefore: Value(row['quantity_before'] as int),
                    quantityAfter: Value(row['quantity_after'] as int),
                    dateAdded: Value(_getDateTime(row['date_added']) ?? DateTime.now()),
                    remarks: Value(_getString(row['remarks'])),
                    syncId: Value(syncId),
                    createdAt: Value(_getDateTime(row['created_at'])),
                    updatedAt: Value(_getDateTime(row['updated_at'])),
                  )
                );
              }
            }
          }
        }

        // --- Business Settings Sync ---
        debugPrint('Syncing Business Settings...');
        if (_tableExists(backupDb, 'business_settings')) {
          final backupSettings = backupDb.select('SELECT * FROM business_settings');
          for (final row in backupSettings) {
             final businessMode = _getString(row['business_mode']) ?? 'retail';
             final incomingUpdate = _getDateTime(row['updated_at']);

             final query = database.select(database.businessSettings)..limit(1);
             final existing = await query.getSingleOrNull();
             
             if (existing != null) {
               if (incomingUpdate != null && (existing.updatedAt == null || incomingUpdate.isAfter(existing.updatedAt!))) {
                 await (database.update(database.businessSettings)..where((s) => s.id.equals(existing!.id))).write(
                   BusinessSettingsCompanion(
                     businessMode: Value(businessMode),
                     updatedAt: Value(incomingUpdate),
                   )
                 );
               }
             } else {
               await database.into(database.businessSettings).insert(
                 BusinessSettingsCompanion.insert(
                   businessMode: Value(businessMode),
                   updatedAt: Value(incomingUpdate),
                 )
               );
             }
          }
        }

        // --- Service Customers Sync ---
        debugPrint('Syncing Service Customers...');
        if (_tableExists(backupDb, 'service_customers')) {
          final backupServiceCustomers = backupDb.select('SELECT * FROM service_customers');
          for (final row in backupServiceCustomers) {
            final id = _getString(row['id'])!;
            final name = _getString(row['name']) ?? '';
            
            final existing = await (database.select(database.customers)..where((t) => t.id.equals(id))).getSingleOrNull();
            if (existing == null) {
              await database.into(database.customers).insert(CustomersCompanion.insert(
                id: id,
                name: name,
                phone: Value(_getString(row['phone'])),
                email: Value(_getString(row['email'])),
                createdAt: Value(_getDateTime(row['created_at']) ?? DateTime.now()),
              ));
            }
          }
        }

        // --- Service Jobs Sync ---
        debugPrint('Syncing Service Jobs...');
        if (_tableExists(backupDb, 'service_jobs')) {
          final backupServiceJobs = backupDb.select('SELECT * FROM service_jobs');
          for (final row in backupServiceJobs) {
            final id = _getString(row['id'])!;
            final jobIdString = _getString(row['job_id']) ?? '';
            
            final existing = await (database.select(database.serviceJobs)..where((t) => t.id.equals(id))).getSingleOrNull();
            if (existing == null) {
              await database.into(database.serviceJobs).insert(ServiceJobsCompanion.insert(
                id: id,
                jobId: jobIdString,
                customerId: _getString(row['customer_id']) ?? '',
                title: _getString(row['title']) ?? '',
                description: Value(_getString(row['description'])),
                totalAmount: (row['total_amount'] as num).toDouble(),
                amountPaid: Value((row['amount_paid'] as num).toDouble()),
                balance: (row['balance'] as num).toDouble(),
                status: Value(_getString(row['status']) ?? 'pending'),
                dueDate: Value(_getDateTime(row['due_date'])),
                createdAt: Value(_getDateTime(row['created_at']) ?? DateTime.now()),
              ));
            }
          }
        }

        // --- Service Payments Sync ---
        debugPrint('Syncing Service Payments...');
        if (_tableExists(backupDb, 'service_payments')) {
          final backupServicePayments = backupDb.select('SELECT * FROM service_payments');
          for (final row in backupServicePayments) {
            final id = _getString(row['id'])!;
            final existing = await (database.select(database.servicePayments)..where((t) => t.id.equals(id))).getSingleOrNull();
            if (existing == null) {
              await database.into(database.servicePayments).insert(ServicePaymentsCompanion.insert(
                id: id,
                jobId: _getString(row['job_id']) ?? '',
                amount: (row['amount'] as num).toDouble(),
                method: _getString(row['method']) ?? 'Cash',
                reference: Value(_getString(row['reference'])),
                createdAt: Value(_getDateTime(row['created_at']) ?? DateTime.now()),
              ));
            }
          }
        }

        // --- Local Counters Sync (Sanity Check) ---
        debugPrint('Syncing Local Counters...');
        if (_tableExists(backupDb, 'local_counters')) {
          final backupCounters = backupDb.select('SELECT * FROM local_counters');
          for (final row in backupCounters) {
            final type = _getString(row['type'])!;
            final lastValue = row['last_value'] as int;
            
            final existing = await (database.select(database.localCounters)..where((t) => t.type.equals(type))).getSingleOrNull();
            if (existing == null || lastValue > existing.lastValue) {
              // Select-then-write: avoid UPSERT for older Android SQLite.
              if (existing == null) {
                await database.into(database.localCounters).insert(
                  LocalCountersCompanion.insert(
                    type: type,
                    lastValue: Value(lastValue),
                  ),
                );
              } else {
                await (database.update(database.localCounters)
                      ..where((t) => t.type.equals(type)))
                    .write(LocalCountersCompanion(lastValue: Value(lastValue)));
              }
            }
          }
        }
      });
      return true;
    } finally {
      backupDb.dispose();
    }
  } catch (e, stack) {
    debugPrint('Native Sync failed: $e');
    debugPrint('Stack trace: $stack');
    rethrow;
  } finally {
    if (tempFile != null && await tempFile.exists()) {
      await tempFile.delete();
    }
  }
}

bool _tableExists(sqlite.Database db, String tableName) {
  final result = db.select("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [tableName]);
  return result.isNotEmpty;
}

String? _getString(dynamic value) {
  if (value == null) return null;
  return value.toString();
}

DateTime? _getDateTime(dynamic value) {
  if (value == null) return null;
  final str = value.toString();
  try {
    return DateTime.parse(str);
  } catch (e) {
    debugPrint('Failed to parse DateTime: $str');
    return null;
  }
}
