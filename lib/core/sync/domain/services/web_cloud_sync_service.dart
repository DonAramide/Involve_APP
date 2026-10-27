import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:get_it/get_it.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/core/utils/app_config.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';
import 'package:involve_app/features/settings/data/repositories/staff_repository_impl.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:uuid/uuid.dart';

/// Pushes local SQLite school records to the tenant web portal.
class WebCloudSyncService {
  static FinanceApiClient _client() {
    final sl = GetIt.instance;
    if (!sl.isRegistered<FinanceApiClient>()) {
      sl.registerSingleton<FinanceApiClient>(FinanceApiClient(
        baseUrl: AppConfig.baseUrl,
        getToken: () async => await SecurityService().getOfflineToken(),
        getTenantId: () async => await SecurityService().getTenantId(),
      ));
    }
    return sl<FinanceApiClient>();
  }

  static AppDatabase? _database() {
    final sl = GetIt.instance;
    if (sl.isRegistered<AppDatabase>()) return sl<AppDatabase>();
    return null;
  }

  /// Upload students, parents, classes, teachers, subjects, results, years, terms.
  static Future<int> pushSchoolRoster({
    AppDatabase? database,
    FinanceApiClient? client,
  }) async {
    final db = database ?? _database();
    final api = client ?? _client();
    if (db == null) {
      debugPrint('[WebCloudSync] No AppDatabase registered');
      return 0;
    }

    final years = await db.select(db.academicYears).get();
    final terms = await db.select(db.terms).get();
    final classes = await db.select(db.classes).get();
    final teachers = await db.select(db.teachers).get();
    final subjects = await db.select(db.subjects).get();
    final students = await db.select(db.students).get();
    List<dynamic> parentRows = [];
    List<dynamic> parentVaRows = [];
    List<dynamic> parentPayRows = [];
    List<dynamic> parentAllocRows = [];
    try {
      parentRows = await db.select(db.parents).get();
      parentVaRows = await db.select(db.parentVirtualAccounts).get();
      parentPayRows = await db.select(db.parentPayments).get();
      parentAllocRows = await db.select(db.parentPaymentAllocations).get();
    } catch (_) {}
    List<dynamic> results = [];
    try {
      results = await db.select(db.results).get();
    } catch (_) {
      results = [];
    }

    String syncKey(String entity, dynamic row) {
      final existing = (row as dynamic).syncId?.toString();
      if (existing != null &&
          existing.isNotEmpty &&
          !existing.startsWith('local-') &&
          RegExp(
            r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
          ).hasMatch(existing)) {
        return existing;
      }
      if (entity == 'parent') {
        return const Uuid().v5(
          '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
          'invify-school-parent-${row.id}',
        );
      }
      if (entity == 'student') {
        final admission = (row as dynamic).admissionNumber?.toString().trim() ?? '';
        if (admission.isNotEmpty) {
          return const Uuid().v5(
            '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
            'invify-school-student-admission-$admission',
          );
        }
      }
      return const Uuid().v5(
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
        'invify-school-$entity-${row.id}',
      );
    }

    List<int> parseIds(String? raw) {
      if (raw == null || raw.trim().isEmpty) return const [];
      return raw
          .split(',')
          .map((s) => int.tryParse(s.trim()))
          .whereType<int>()
          .toList();
    }

    bool subjectTaughtBy(dynamic subject, int teacherId) {
      if (subject.teacherId == teacherId) return true;
      return parseIds(subject.teacherIds as String?).contains(teacherId);
    }

    final classNameById = {for (final c in classes) c.id: c.name};
    final teacherNameById = {for (final t in teachers) t.id: t.fullName};
    final subjectNameById = {for (final s in subjects) s.id: s.name};
    final studentById = {for (final s in students) s.id: s};
    final subjectById = {for (final s in subjects) s.id: s};
    final studentNameById = {
      for (final s in students)
        s.id: [
          s.firstName,
          if ((s.middleName ?? '').toString().trim().isNotEmpty) s.middleName,
          s.lastName,
        ].whereType<String>().where((p) => p.trim().isNotEmpty).join(' '),
    };
    final parentSyncById = {
      for (final p in parentRows) p.id as int: syncKey('parent', p),
    };
    final parentAddressById = {
      for (final p in parentRows) p.id as int: (p.address as String?),
    };
    final termNameById = {for (final t in terms) t.id: t.name};
    final yearNameById = {for (final y in years) y.id: y.name};

    final schoolPayload = {
      'years': years
          .map((y) => {
                'id': y.id,
                'syncId': syncKey('year', y),
                'name': y.name,
                'startDate': y.startDate.toIso8601String(),
                'endDate': y.endDate.toIso8601String(),
                'isCurrent': y.isCurrent,
                'isDeleted': y.isDeleted,
              })
          .toList(),
      'terms': terms
          .map((t) => {
                'id': t.id,
                'syncId': syncKey('term', t),
                'name': t.name,
                'academicYearId': t.academicYearId,
                'academicYearName': yearNameById[t.academicYearId],
                'startDate': t.startDate.toIso8601String(),
                'endDate': t.endDate.toIso8601String(),
                'isCurrent': t.isCurrent,
                'isDeleted': t.isDeleted,
              })
          .toList(),
      'classes': classes
          .map((c) => {
                'id': c.id,
                'syncId': syncKey('class', c),
                'name': c.name,
                'description': c.description,
                'isDeleted': c.isDeleted,
              })
          .toList(),
      'teachers': teachers
          .map((t) => {
                'id': t.id,
                'syncId': syncKey('teacher', t),
                'fullName': t.fullName,
                'phone': t.phone,
                'profession': t.profession,
                'classId': t.classId,
                'classIds': t.classIds,
                'classNames': [
                  if (t.classId != null) classNameById[t.classId],
                  ...parseIds(t.classIds)
                      .map((id) => classNameById[id])
                      .whereType<String>(),
                ].toSet().join(', '),
                'subjectIds': subjects
                    .where((s) => subjectTaughtBy(s, t.id))
                    .map((s) => s.id)
                    .toList(),
                'subjectNames': subjects
                    .where((s) => subjectTaughtBy(s, t.id))
                    .map((s) => s.name)
                    .join(', '),
                'salary': t.salary,
                'certificates': t.certificates,
                'yearsInSchool': t.yearsInSchool,
                'employmentDate': t.employmentDate.toIso8601String(),
                'isDeleted': t.isDeleted,
              })
          .toList(),
      'subjects': subjects.map((s) {
        final teacherIdList = {
          if (s.teacherId != null) s.teacherId!,
          ...parseIds(s.teacherIds),
        }.toList()
          ..sort();
        final classIdList = parseIds(s.classIds);
        return {
          'id': s.id,
          'syncId': syncKey('subject', s),
          'name': s.name,
          'code': s.code,
          'teacherId': s.teacherId,
          'teacherIds': teacherIdList.join(','),
          'teacherNames': teacherIdList
              .map((id) => teacherNameById[id])
              .whereType<String>()
              .join(', '),
          'classIds': s.classIds,
          'classNames': classIdList.isEmpty
              ? 'All classes'
              : classIdList
                  .map((id) => classNameById[id])
                  .whereType<String>()
                  .join(', '),
          'isDeleted': s.isDeleted,
        };
      }).toList(),
      'students': students
          .map((s) => {
                'id': s.id,
                'syncId': syncKey('student', s),
                'admissionNumber': s.admissionNumber,
                'firstName': s.firstName,
                'middleName': s.middleName,
                'lastName': s.lastName,
                'classId': s.classId,
                'className': classNameById[s.classId],
                'academicYearId': s.academicYearId,
                'academicYearName': yearNameById[s.academicYearId],
                'parentName': s.parentName,
                'parentPhone': s.parentPhone,
                'parentId': s.parentId,
                'parentSyncId': s.parentId != null ? parentSyncById[s.parentId] : null,
                'parentAddress': s.parentId != null ? parentAddressById[s.parentId] : null,
                'address': s.parentId != null ? parentAddressById[s.parentId] : null,
                'balance': s.balance,
                'creditBalance': s.creditBalance,
                'gender': s.gender,
                'department': s.department,
                'dateOfBirth': s.dateOfBirth?.toIso8601String(),
                'registrationDate': s.registrationDate?.toIso8601String(),
                'virtualAccountNumber': s.virtualAccountNumber,
                'virtualAccountBank': s.virtualAccountBank,
                'virtualAccountStatus': s.virtualAccountStatus,
                'notes': s.notes,
                'health_condition': s.notes,
                'healthCondition': s.notes,
                'isDeleted': s.isDeleted,
              })
          .toList(),
      'parents': parentRows
          .map((p) => {
                'id': p.id,
                'syncId': syncKey('parent', p),
                'fullName': p.fullName,
                'phone': p.phone,
                'email': p.email,
                'address': p.address,
                'virtualAccountNumber': p.virtualAccountNumber,
                'virtualAccountBank': p.virtualAccountBank,
                'virtualAccountName': p.virtualAccountName,
                'virtualAccountStatus': p.virtualAccountStatus,
                'creditBalance': p.creditBalance,
                'isDeleted': p.isDeleted,
              })
          .toList(),
      'parentVirtualAccounts': parentVaRows
          .map((v) => {
                'id': v.id,
                'parentId': v.parentId,
                'accountNumber': v.accountNumber,
                'bankName': v.bankName,
                'accountName': v.accountName,
                'kind': v.kind,
                'isCanonical': v.isCanonical,
              })
          .toList(),
      'parentPayments': parentPayRows
          .map((p) => {
                'id': p.id,
                'parentId': p.parentId,
                'reference': p.reference,
                'amount': p.amount,
                'appliedToDebt': p.appliedToDebt,
                'toCredit': p.toCredit,
                'parentOutstandingBefore': p.parentOutstandingBefore,
                'parentOutstandingAfter': p.parentOutstandingAfter,
                'parentCreditBefore': p.parentCreditBefore,
                'parentCreditAfter': p.parentCreditAfter,
                'virtualAccountNumber': p.virtualAccountNumber,
                'source': p.source,
                'createdAt': p.createdAt?.toIso8601String(),
              })
          .toList(),
      'parentPaymentAllocations': parentAllocRows
          .map((a) => {
                'id': a.id,
                'parentPaymentId': a.parentPaymentId,
                'studentId': a.studentId,
                'outstandingBefore': a.outstandingBefore,
                'allocated': a.allocated,
                'outstandingAfter': a.outstandingAfter,
              })
          .toList(),
      'results': results.map((r) {
        final studentRow = studentById[r.studentId];
        final subjectRow = subjectById[r.subjectId];
        return {
          'id': r.id,
          'syncId': syncKey('result', r),
          'studentId': r.studentId,
          'studentSyncId': studentRow != null ? syncKey('student', studentRow) : null,
          'studentName': studentNameById[r.studentId],
          'subjectId': r.subjectId,
          'subjectSyncId': subjectRow != null ? syncKey('subject', subjectRow) : null,
          'subjectName': subjectNameById[r.subjectId],
          'termId': r.termId,
          'termName': termNameById[r.termId],
          'academicYearId': r.academicYearId,
          'academicYearName': yearNameById[r.academicYearId],
          'assessmentScore': r.assessmentScore,
          'examScore': r.examScore,
          'totalScore': r.totalScore,
          'grade': r.grade,
          'remarks': r.remarks,
          'dateEntered': r.dateEntered?.toIso8601String(),
          'isDeleted': r.isDeleted,
        };
      }).toList(),
    };

    final hasSchoolData = (schoolPayload['students'] as List).isNotEmpty ||
        (schoolPayload['classes'] as List).isNotEmpty ||
        (schoolPayload['teachers'] as List).isNotEmpty ||
        (schoolPayload['years'] as List).isNotEmpty ||
        (schoolPayload['subjects'] as List).isNotEmpty ||
        (schoolPayload['results'] as List).isNotEmpty ||
        (schoolPayload['parents'] as List).isNotEmpty;

    if (!hasSchoolData) {
      debugPrint('[WebCloudSync] no local academic/student rows');
      return 0;
    }

    final schoolResult = await api.post('/api/school/bulk-sync', data: schoolPayload);
    final schoolErrors = schoolResult.data?['errors'];
    if (schoolErrors is List && schoolErrors.isNotEmpty) {
      throw Exception(schoolErrors.first.toString());
    }
    final synced = schoolResult.data?['synced'];
    debugPrint('[WebCloudSync] school synced=$synced errors=$schoolErrors');
    return int.tryParse('$synced') ?? (schoolPayload['students'] as List).length;
  }

  /// Copies the school already stored on the web portal into this tablet.
  /// Used when the original device is gone and a newly linked tablet is empty.
  /// Returns how many students, fees, and bills were written.
  static Future<SchoolWebRestore> pullSchoolRoster({
    AppDatabase? database,
    FinanceApiClient? client,
  }) async {
    final db = database ?? _database();
    final api = client ?? _client();
    if (db == null) {
      debugPrint('[WebCloudSync] No AppDatabase registered');
      return const SchoolWebRestore(students: 0, fees: 0, bills: 0, staff: 0);
    }
    final response = await api.get('/api/school/roster');
    final body = response.data;
    final data = body is Map ? (body['data'] ?? body) : null;
    if (data is! Map) {
      throw Exception('The web portal did not return school records.');
    }

    final years = _rows(data['years']);
    final terms = _rows(data['terms']);
    final classes = _rows(data['classes']);
    final teachers = _rows(data['teachers']);
    final subjects = _rows(data['subjects']);
    final parents = _rows(data['parents']);
    final students = _rows(data['students']);
    final accounts = _rows(data['parentVirtualAccounts']);
    final payments = _rows(data['parentPayments']);
    final allocations = _rows(data['parentPaymentAllocations']);
    final results = _rows(data['results']);

    final yearIds = <String, int>{};
    final termIds = <String, int>{};
    final classIds = <String, int>{};
    final teacherIds = <String, int>{};
    final subjectIds = <String, int>{};
    final parentIds = <String, int>{};
    final studentIds = <String, int>{};
    final paymentIds = <String, int>{};

    for (final row in years) {
      final localId = await _upsertYear(db, row);
      _remember(yearIds, row, localId);
    }
    for (final row in terms) {
      final localId = await _upsertTerm(db, row, yearIds);
      if (localId != null) _remember(termIds, row, localId);
    }
    for (final row in classes) {
      final localId = await _upsertClass(db, row);
      if (localId != null) _remember(classIds, row, localId);
    }
    for (final row in teachers) {
      final localId = await _upsertTeacher(db, row, classIds);
      if (localId != null) _remember(teacherIds, row, localId);
    }
    for (final row in parents) {
      final localId = await _upsertParent(db, row);
      if (localId != null) _remember(parentIds, row, localId);
    }
    for (final row in students) {
      final localId = await _upsertStudent(db, row, classIds, yearIds, parentIds);
      if (localId != null) _remember(studentIds, row, localId);
    }
    for (final row in subjects) {
      final localId = await _upsertSubject(db, row, teacherIds, classIds);
      if (localId != null) _remember(subjectIds, row, localId);
    }
    for (final row in accounts) {
      await _upsertParentAccount(db, row, parentIds);
    }
    for (final row in payments) {
      final localId = await _upsertParentPayment(db, row, parentIds);
      if (localId != null) _remember(paymentIds, row, localId);
    }
    for (final row in allocations) {
      await _upsertAllocation(db, row, paymentIds, studentIds);
    }
    for (final row in results) {
      await _upsertResult(db, row, studentIds, subjectIds, termIds, yearIds);
    }

    final billing = await _pullFeesAndBills(db, api);
    final staff = await _pullStaff(db, api);
    debugPrint(
      '[WebCloudSync] restored students=${students.length} fees=${billing.fees} bills=${billing.bills} staff=$staff',
    );
    return SchoolWebRestore(
      students: students.length,
      fees: billing.fees,
      bills: billing.bills,
      staff: staff,
    );
  }
}

class SchoolWebRestore {
  final int students;
  final int fees;
  final int bills;
  final int staff;

  const SchoolWebRestore({
    required this.students,
    required this.fees,
    required this.bills,
    this.staff = 0,
  });

  bool get isEmpty => students == 0 && fees == 0 && bills == 0 && staff == 0;

  String get banner {
    if (isEmpty) return 'No school records are on the web portal yet.';
    final parts = <String>[
      if (students > 0) '$students students',
      if (staff > 0) '$staff staff',
      if (fees > 0) '$fees fees',
      if (bills > 0) '$bills bills',
    ];
    return 'Downloaded from the web portal: ${parts.join(', ')}.';
  }
}

List<Map<String, dynamic>> _rows(dynamic value) {
  if (value is! List) return const [];
  return value.whereType<Map>().map((row) => Map<String, dynamic>.from(row)).toList();
}

void _remember(Map<String, int> index, Map<String, dynamic> row, int localId) {
  for (final key in [row['syncId'], row['id'], row['localId']]) {
    final text = key?.toString().trim() ?? '';
    if (text.isNotEmpty) index[text] = localId;
  }
}

int? _lookup(Map<String, int> index, dynamic value) {
  final text = value?.toString().trim() ?? '';
  if (text.isEmpty) return null;
  return index[text];
}

String _text(dynamic value) => value?.toString().trim() ?? '';

bool _flag(dynamic value) => value == true || value == 1 || value == 'true';

double _num(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse('${value ?? ''}') ?? 0;
}

DateTime _date(dynamic value) => DateTime.tryParse(_text(value)) ?? DateTime.now();

Future<int> _upsertYear(AppDatabase db, Map<String, dynamic> row) async {
  final name = _text(row['name']);
  if (name.isEmpty) return 0;
  final syncId = _text(row['syncId'] ?? row['id']);
  final existing = await _findYear(db, syncId, name);
  final companion = AcademicYearsCompanion(
    name: Value(name),
    startDate: Value(_date(row['startDate'])),
    endDate: Value(_date(row['endDate'])),
    isCurrent: Value(_flag(row['isCurrent'])),
    syncId: Value(syncId.isEmpty ? null : syncId),
    isDeleted: Value(_flag(row['isDeleted'])),
    updatedAt: Value(DateTime.now()),
  );
  if (existing != null) {
    await (db.update(db.academicYears)..where((t) => t.id.equals(existing))).write(companion);
    return existing;
  }
  return db.into(db.academicYears).insert(companion);
}

Future<int?> _findYear(AppDatabase db, String syncId, String name) async {
  if (syncId.isNotEmpty) {
    final bySync = await (db.select(db.academicYears)..where((t) => t.syncId.equals(syncId))).get();
    if (bySync.isNotEmpty) return bySync.first.id;
  }
  final byName = await (db.select(db.academicYears)..where((t) => t.name.equals(name))).get();
  return byName.isEmpty ? null : byName.first.id;
}

Future<int?> _upsertTerm(AppDatabase db, Map<String, dynamic> row, Map<String, int> yearIds) async {
  final name = _text(row['name']);
  final yearId = _lookup(yearIds, row['academicYearId']) ??
      await _findYear(db, '', _text(row['academicYearName']));
  if (name.isEmpty || yearId == null || yearId == 0) return null;
  final syncId = _text(row['syncId'] ?? row['id']);
  final existing = syncId.isEmpty
      ? await (db.select(db.terms)
            ..where((t) => t.academicYearId.equals(yearId) & t.name.equals(name)))
          .get()
      : await (db.select(db.terms)..where((t) => t.syncId.equals(syncId))).get();
  final companion = TermsCompanion(
    academicYearId: Value(yearId),
    name: Value(name),
    startDate: Value(_date(row['startDate'])),
    endDate: Value(_date(row['endDate'])),
    isCurrent: Value(_flag(row['isCurrent'])),
    syncId: Value(syncId.isEmpty ? null : syncId),
    isDeleted: Value(_flag(row['isDeleted'])),
    updatedAt: Value(DateTime.now()),
  );
  if (existing.isNotEmpty) {
    await (db.update(db.terms)..where((t) => t.id.equals(existing.first.id))).write(companion);
    return existing.first.id;
  }
  return db.into(db.terms).insert(companion);
}

Future<int?> _upsertClass(AppDatabase db, Map<String, dynamic> row) async {
  final name = _text(row['name']);
  if (name.isEmpty) return null;
  final syncId = _text(row['syncId'] ?? row['id']);
  var existing = syncId.isEmpty
      ? <ClassTable>[]
      : await (db.select(db.classes)..where((t) => t.syncId.equals(syncId))).get();
  if (existing.isEmpty) {
    existing = await (db.select(db.classes)..where((t) => t.name.equals(name))).get();
  }
  final companion = ClassesCompanion(
    name: Value(name),
    description: Value(_text(row['description']).isEmpty ? null : _text(row['description'])),
    syncId: Value(syncId.isEmpty ? null : syncId),
    isDeleted: Value(_flag(row['isDeleted'])),
    updatedAt: Value(DateTime.now()),
  );
  if (existing.isNotEmpty) {
    await (db.update(db.classes)..where((t) => t.id.equals(existing.first.id))).write(companion);
    return existing.first.id;
  }
  return db.into(db.classes).insert(companion);
}

Future<int?> _upsertTeacher(
  AppDatabase db,
  Map<String, dynamic> row,
  Map<String, int> classIds,
) async {
  final name = _text(row['fullName']);
  if (name.isEmpty) return null;
  final syncId = _text(row['syncId'] ?? row['id']);
  final existing = syncId.isEmpty
      ? await (db.select(db.teachers)..where((t) => t.fullName.equals(name))).get()
      : await (db.select(db.teachers)..where((t) => t.syncId.equals(syncId))).get();
  final companion = TeachersCompanion(
    fullName: Value(name),
    phone: Value(_text(row['phone']).isEmpty ? null : _text(row['phone'])),
    profession: Value(_text(row['profession']).isEmpty ? null : _text(row['profession'])),
    classId: Value(_lookup(classIds, row['classId'])),
    salary: Value(_num(row['salary'])),
    classIds: Value(_remapIdList(row['classIds'], classIds)),
    syncId: Value(syncId.isEmpty ? null : syncId),
    isDeleted: Value(_flag(row['isDeleted'])),
    updatedAt: Value(DateTime.now()),
  );
  if (existing.isNotEmpty) {
    await (db.update(db.teachers)..where((t) => t.id.equals(existing.first.id))).write(companion);
    return existing.first.id;
  }
  return db.into(db.teachers).insert(companion);
}

Future<int?> _upsertParent(AppDatabase db, Map<String, dynamic> row) async {
  final name = _text(row['fullName']);
  if (name.isEmpty) return null;
  final syncId = _text(row['syncId'] ?? row['id']);
  final existing = syncId.isEmpty
      ? await (db.select(db.parents)..where((t) => t.fullName.equals(name))).get()
      : await (db.select(db.parents)..where((t) => t.syncId.equals(syncId))).get();
  final companion = ParentsCompanion(
    fullName: Value(name),
    phone: Value(_text(row['phone']).isEmpty ? null : _text(row['phone'])),
    email: Value(_text(row['email']).isEmpty ? null : _text(row['email'])),
    address: Value(_text(row['address']).isEmpty ? null : _text(row['address'])),
    virtualAccountNumber: Value(_text(row['virtualAccountNumber']).isEmpty ? null : _text(row['virtualAccountNumber'])),
    virtualAccountBank: Value(_text(row['virtualAccountBank']).isEmpty ? null : _text(row['virtualAccountBank'])),
    virtualAccountName: Value(_text(row['virtualAccountName']).isEmpty ? null : _text(row['virtualAccountName'])),
    virtualAccountStatus: Value(_text(row['virtualAccountStatus']).isEmpty ? null : _text(row['virtualAccountStatus'])),
    creditBalance: Value(_num(row['creditBalance'])),
    syncId: Value(syncId.isEmpty ? null : syncId),
    isDeleted: Value(_flag(row['isDeleted'])),
    updatedAt: Value(DateTime.now()),
  );
  if (existing.isNotEmpty) {
    await (db.update(db.parents)..where((t) => t.id.equals(existing.first.id))).write(companion);
    return existing.first.id;
  }
  return db.into(db.parents).insert(companion);
}

Future<int?> _upsertStudent(
  AppDatabase db,
  Map<String, dynamic> row,
  Map<String, int> classIds,
  Map<String, int> yearIds,
  Map<String, int> parentIds,
) async {
  final admission = _text(row['admissionNumber'] ?? row['admission_number']);
  final first = _text(row['firstName'] ?? row['first_name']);
  final last = _text(row['lastName'] ?? row['last_name']);
  if (admission.isEmpty || first.isEmpty || last.isEmpty) return null;
  var classId = _lookup(classIds, row['classId']);
  final className = _text(row['className'] ?? row['current_class']);
  if (classId == null && className.isNotEmpty) {
    final named = await (db.select(db.classes)..where((t) => t.name.equals(className))).get();
    if (named.isNotEmpty) classId = named.first.id;
  }
  if (classId == null) {
    final unassigned = await (db.select(db.classes)..where((t) => t.name.equals('Unassigned'))).get();
    if (unassigned.isNotEmpty) {
      classId = unassigned.first.id;
    } else {
      classId = await db.into(db.classes).insert(ClassesCompanion.insert(name: 'Unassigned'));
    }
    classIds['Unassigned'] = classId;
  }
  final syncId = _text(row['syncId'] ?? row['id']);
  var existing = await (db.select(db.students)..where((t) => t.admissionNumber.equals(admission))).get();
  if (existing.isEmpty && syncId.isNotEmpty) {
    existing = await (db.select(db.students)..where((t) => t.syncId.equals(syncId))).get();
  }
  final companion = StudentsCompanion(
    admissionNumber: Value(admission),
    firstName: Value(first),
    middleName: Value(_text(row['middleName'] ?? row['middle_name']).isEmpty ? null : _text(row['middleName'] ?? row['middle_name'])),
    lastName: Value(last),
    classId: Value(classId),
    academicYearId: Value(_lookup(yearIds, row['academicYearId'])),
    parentId: Value(_lookup(parentIds, row['parentSyncId']) ?? _lookup(parentIds, row['parentId'])),
    parentName: Value(_text(row['parentName'] ?? row['parent_name']).isEmpty ? null : _text(row['parentName'] ?? row['parent_name'])),
    parentPhone: Value(_text(row['parentPhone'] ?? row['parent_phone']).isEmpty ? null : _text(row['parentPhone'] ?? row['parent_phone'])),
    balance: Value(_num(row['balance'] ?? row['running_balance'])),
    creditBalance: Value(_num(row['creditBalance'])),
    gender: Value(_text(row['gender']).isEmpty ? null : _text(row['gender'])),
    department: Value(_text(row['department']).isEmpty ? null : _text(row['department'])),
    enrollmentStatus: Value(_text(row['enrollmentStatus']).isEmpty ? 'active' : _text(row['enrollmentStatus'])),
    notes: Value(_text(row['notes']).isEmpty ? null : _text(row['notes'])),
    virtualAccountNumber: Value(_text(row['virtualAccountNumber']).isEmpty ? null : _text(row['virtualAccountNumber'])),
    virtualAccountBank: Value(_text(row['virtualAccountBank']).isEmpty ? null : _text(row['virtualAccountBank'])),
    virtualAccountStatus: Value(_text(row['virtualAccountStatus']).isEmpty ? null : _text(row['virtualAccountStatus'])),
    syncId: Value(syncId.isEmpty ? null : syncId),
    isDeleted: Value(_flag(row['isDeleted'])),
    updatedAt: Value(DateTime.now()),
  );
  if (existing.isNotEmpty) {
    await (db.update(db.students)..where((t) => t.id.equals(existing.first.id))).write(companion);
    return existing.first.id;
  }
  return db.into(db.students).insert(companion);
}

Future<int?> _upsertSubject(
  AppDatabase db,
  Map<String, dynamic> row,
  Map<String, int> teacherIds,
  Map<String, int> classIds,
) async {
  final name = _text(row['name']);
  if (name.isEmpty) return null;
  final syncId = _text(row['syncId'] ?? row['id']);
  var existing = syncId.isEmpty
      ? <SubjectTable>[]
      : await (db.select(db.subjects)..where((t) => t.syncId.equals(syncId))).get();
  if (existing.isEmpty) {
    existing = await (db.select(db.subjects)..where((t) => t.name.equals(name))).get();
  }
  final companion = SubjectsCompanion(
    name: Value(name),
    code: Value(_text(row['code']).isEmpty ? null : _text(row['code'])),
    teacherId: Value(_lookup(teacherIds, row['teacherId'])),
    teacherIds: Value(_remapIdList(row['teacherIds'], teacherIds)),
    classIds: Value(_remapIdList(row['classIds'], classIds)),
    syncId: Value(syncId.isEmpty ? null : syncId),
    isDeleted: Value(_flag(row['isDeleted'])),
    updatedAt: Value(DateTime.now()),
  );
  if (existing.isNotEmpty) {
    await (db.update(db.subjects)..where((t) => t.id.equals(existing.first.id))).write(companion);
    return existing.first.id;
  }
  return db.into(db.subjects).insert(companion);
}

Future<void> _upsertParentAccount(
  AppDatabase db,
  Map<String, dynamic> row,
  Map<String, int> parentIds,
) async {
  final parentId = _lookup(parentIds, row['parentSyncId']) ?? _lookup(parentIds, row['parentId']);
  final account = _text(row['accountNumber']);
  if (parentId == null || account.isEmpty) return;
  final existing = await (db.select(db.parentVirtualAccounts)
        ..where((t) => t.accountNumber.equals(account)))
      .get();
  final companion = ParentVirtualAccountsCompanion(
    parentId: Value(parentId),
    accountNumber: Value(account),
    bankName: Value(_text(row['bankName']).isEmpty ? null : _text(row['bankName'])),
    accountName: Value(_text(row['accountName']).isEmpty ? null : _text(row['accountName'])),
    kind: Value(_text(row['kind']).isEmpty ? 'legacy' : _text(row['kind'])),
    isCanonical: Value(_flag(row['isCanonical'])),
    syncId: Value(_text(row['syncId']).isEmpty ? null : _text(row['syncId'])),
    updatedAt: Value(DateTime.now()),
  );
  if (existing.isNotEmpty) {
    await (db.update(db.parentVirtualAccounts)..where((t) => t.id.equals(existing.first.id))).write(companion);
    return;
  }
  await db.into(db.parentVirtualAccounts).insert(companion);
}

Future<int?> _upsertParentPayment(
  AppDatabase db,
  Map<String, dynamic> row,
  Map<String, int> parentIds,
) async {
  final parentId = _lookup(parentIds, row['parentSyncId']) ?? _lookup(parentIds, row['parentId']);
  final reference = _text(row['reference']);
  if (parentId == null || reference.isEmpty) return null;
  final existing = await (db.select(db.parentPayments)..where((t) => t.reference.equals(reference))).get();
  final companion = ParentPaymentsCompanion(
    parentId: Value(parentId),
    reference: Value(reference),
    amount: Value(_num(row['amount'])),
    appliedToDebt: Value(_num(row['appliedToDebt'])),
    toCredit: Value(_num(row['toCredit'])),
    parentOutstandingBefore: Value(_num(row['parentOutstandingBefore'])),
    parentOutstandingAfter: Value(_num(row['parentOutstandingAfter'])),
    parentCreditBefore: Value(_num(row['parentCreditBefore'])),
    parentCreditAfter: Value(_num(row['parentCreditAfter'])),
    virtualAccountNumber: Value(_text(row['virtualAccountNumber']).isEmpty ? null : _text(row['virtualAccountNumber'])),
    source: Value(_text(row['source']).isEmpty ? 'va_deposit' : _text(row['source'])),
    syncId: Value(_text(row['syncId']).isEmpty ? null : _text(row['syncId'])),
    isDeleted: Value(_flag(row['isDeleted'])),
  );
  if (existing.isNotEmpty) {
    await (db.update(db.parentPayments)..where((t) => t.id.equals(existing.first.id))).write(companion);
    return existing.first.id;
  }
  return db.into(db.parentPayments).insert(companion);
}

Future<void> _upsertAllocation(
  AppDatabase db,
  Map<String, dynamic> row,
  Map<String, int> paymentIds,
  Map<String, int> studentIds,
) async {
  final paymentId = _lookup(paymentIds, row['parentPaymentSyncId']) ?? _lookup(paymentIds, row['parentPaymentId']);
  final studentId = _lookup(studentIds, row['studentSyncId']) ?? _lookup(studentIds, row['studentId']);
  if (paymentId == null || studentId == null) return;
  final existing = await (db.select(db.parentPaymentAllocations)
        ..where((t) => t.parentPaymentId.equals(paymentId) & t.studentId.equals(studentId)))
      .get();
  final companion = ParentPaymentAllocationsCompanion(
    parentPaymentId: Value(paymentId),
    studentId: Value(studentId),
    outstandingBefore: Value(_num(row['outstandingBefore'])),
    allocated: Value(_num(row['allocated'])),
    outstandingAfter: Value(_num(row['outstandingAfter'])),
  );
  if (existing.isNotEmpty) {
    await (db.update(db.parentPaymentAllocations)..where((t) => t.id.equals(existing.first.id))).write(companion);
    return;
  }
  await db.into(db.parentPaymentAllocations).insert(companion);
}

Future<void> _upsertResult(
  AppDatabase db,
  Map<String, dynamic> row,
  Map<String, int> studentIds,
  Map<String, int> subjectIds,
  Map<String, int> termIds,
  Map<String, int> yearIds,
) async {
  final studentId = _lookup(studentIds, row['studentSyncId']) ?? _lookup(studentIds, row['studentId']);
  final subjectId = _lookup(subjectIds, row['subjectSyncId']) ?? _lookup(subjectIds, row['subjectId']);
  final termId = _lookup(termIds, row['termId']);
  final yearId = _lookup(yearIds, row['academicYearId']);
  if (studentId == null || subjectId == null || termId == null || yearId == null) return;
  final syncId = _text(row['syncId'] ?? row['id']);
  var existing = syncId.isEmpty
      ? <ResultTable>[]
      : await (db.select(db.results)..where((t) => t.syncId.equals(syncId))).get();
  if (existing.isEmpty) {
    existing = await (db.select(db.results)
          ..where((t) =>
              t.studentId.equals(studentId) &
              t.subjectId.equals(subjectId) &
              t.termId.equals(termId) &
              t.academicYearId.equals(yearId)))
        .get();
  }
  final companion = ResultsCompanion(
    studentId: Value(studentId),
    subjectId: Value(subjectId),
    termId: Value(termId),
    academicYearId: Value(yearId),
    assessmentScore: Value(_num(row['assessmentScore'])),
    examScore: Value(_num(row['examScore'])),
    totalScore: Value(_num(row['totalScore'])),
    grade: Value(_text(row['grade']).isEmpty ? null : _text(row['grade'])),
    remarks: Value(_text(row['remarks']).isEmpty ? null : _text(row['remarks'])),
    syncId: Value(syncId.isEmpty ? null : syncId),
    isDeleted: Value(_flag(row['isDeleted'])),
    updatedAt: Value(DateTime.now()),
  );
  if (existing.isNotEmpty) {
    await (db.update(db.results)..where((t) => t.id.equals(existing.first.id))).write(companion);
    return;
  }
  await db.into(db.results).insert(companion);
}

Future<int> _pullStaff(AppDatabase db, FinanceApiClient api) async {
  try {
    final response = await api.get('/api/staff', queryParameters: {'forDevice': '1'});
    final body = response.data;
    final rows = body is Map ? _rows(body['data'] ?? body['staff']) : _rows(body);
    if (rows.isEmpty) return 0;
    return StaffRepositoryImpl(db).applyCloudStaffRecords(rows);
  } catch (e) {
    debugPrint('[WebCloudSync] staff download failed: $e');
    return 0;
  }
}

Future<({int fees, int bills})> _pullFeesAndBills(AppDatabase db, FinanceApiClient api) async {
  final payload = await _loadBilling(api);
  final feeRows = _rows(payload['fees']);
  final invoiceRows = _rows(payload['invoices']);
  final feeIds = <String, int>{};
  var fees = 0;
  var bills = 0;

  for (final row in feeRows) {
    final localId = await _upsertSchoolFee(db, row, catalog: _isCatalogFee(row));
    if (localId == null) continue;
    _remember(feeIds, row, localId);
    if (_isCatalogFee(row)) fees++;
  }

  final students = await db.select(db.students).get();
  final classes = await db.select(db.classes).get();
  final classNameById = {for (final row in classes) row.id: row.name};

  for (final row in invoiceRows) {
    final wrote = await _upsertSchoolBill(db, row, feeIds, students, classNameById);
    if (wrote) bills++;
  }
  return (fees: fees, bills: bills);
}

Future<Map<String, dynamic>> _loadBilling(FinanceApiClient api) async {
  try {
    final response = await api.get('/api/school/billing');
    final body = response.data;
    if (body is Map && (body['fees'] is List || body['invoices'] is List)) {
      return Map<String, dynamic>.from(body);
    }
  } catch (e) {
    debugPrint('[WebCloudSync] billing snapshot unavailable, using invoices: $e');
  }

  final listResponse = await api.get('/api/v1/finance/invoices');
  final listBody = listResponse.data;
  final listed = listBody is Map ? _rows(listBody['data'] ?? listBody['invoices']) : _rows(listBody);
  final invoices = <Map<String, dynamic>>[];
  for (final row in listed.take(200)) {
    final id = _text(row['id']);
    if (id.isEmpty) continue;
    try {
      final detail = await api.get('/api/v1/finance/invoices/$id');
      final detailBody = detail.data;
      final data = detailBody is Map ? (detailBody['data'] ?? detailBody) : row;
      if (data is Map) {
        invoices.add(Map<String, dynamic>.from(data));
      }
    } catch (e) {
      debugPrint('[WebCloudSync] invoice $id skipped: $e');
      invoices.add(row);
    }
  }
  final fees = <Map<String, dynamic>>[];
  final seen = <String>{};
  for (final invoice in invoices) {
    for (final line in _rows(invoice['items'])) {
      final name = _text(line['name'] ?? line['itemName']);
      final key = name.toLowerCase();
      if (name.isEmpty || !seen.add(key)) continue;
      fees.add({
        'id': line['item_id'] ?? line['itemId'],
        'name': name,
        'price': line['unit_price'] ?? line['unitPrice'],
        'type': line['type'] ?? 'service',
      });
    }
  }
  return {'fees': fees, 'invoices': invoices};
}

bool _isCatalogFee(Map<String, dynamic> row) {
  final name = _text(row['name']).toLowerCase();
  if (name.isEmpty) return false;
  if (name.startsWith('school fees payment')) return false;
  if (name == 'previous term balance') return false;
  final mode = _text(row['business_mode'] ?? row['businessMode']);
  final type = _text(row['type']);
  if (mode == 'school_history') return false;
  return mode == 'school' || type == 'service' || type.isEmpty;
}

Future<int?> _upsertSchoolFee(
  AppDatabase db,
  Map<String, dynamic> row, {
  required bool catalog,
}) async {
  final name = _text(row['name']);
  if (name.isEmpty) return null;
  final syncId = _text(row['syncId'] ?? row['id']);
  final price = _num(row['price'] ?? row['unit_price'] ?? row['unitPrice']);
  var existing = syncId.isEmpty
      ? <ItemTable>[]
      : await (db.select(db.items)..where((t) => t.syncId.equals(syncId))).get();
  if (existing.isEmpty) {
    existing = await (db.select(db.items)..where((t) => t.name.equals(name))).get();
  }
  final companion = ItemsCompanion(
    name: Value(name),
    category: Value(_text(row['category']).isEmpty ? 'service' : _text(row['category'])),
    price: Value(price),
    type: Value('service'),
    billingType: Value(
      _text(row['billing_type'] ?? row['billingType']).isEmpty
          ? 'fixed'
          : _text(row['billing_type'] ?? row['billingType']),
    ),
    businessMode: Value(catalog ? 'school' : 'school_history'),
    syncId: Value(syncId.isEmpty ? null : syncId),
    isDeleted: Value(_flag(row['is_deleted'] ?? row['isDeleted'])),
    updatedAt: Value(DateTime.now()),
  );
  if (existing.isNotEmpty) {
    await (db.update(db.items)..where((t) => t.id.equals(existing.first.id))).write(companion);
    return existing.first.id;
  }
  return db.into(db.items).insert(companion);
}

Future<bool> _upsertSchoolBill(
  AppDatabase db,
  Map<String, dynamic> row,
  Map<String, int> feeIds,
  List<StudentTable> students,
  Map<int, String> classNameById,
) async {
  final number = _text(row['invoice_number'] ?? row['invoiceNumber']);
  if (number.isEmpty) return false;
  final cloudId = _text(row['id'] ?? row['syncId']);
  final admission = _text(row['admission_number'] ?? row['admissionNumber']).isNotEmpty
      ? _text(row['admission_number'] ?? row['admissionNumber'])
      : _admissionFromBillNumber(number);
  final customerId = _text(row['customer_id'] ?? row['customerId'] ?? row['studentSyncId']);
  StudentTable? student;
  for (final candidate in students) {
    if (customerId.isNotEmpty && candidate.syncId == customerId) {
      student = candidate;
      break;
    }
    if (admission.isNotEmpty && candidate.admissionNumber.toLowerCase() == admission.toLowerCase()) {
      student = candidate;
      break;
    }
  }
  final studentName = _text(row['customer_name'] ?? row['customerName']);
  if (student == null && studentName.isNotEmpty) {
    final wanted = studentName.toLowerCase();
    for (final candidate in students) {
      final full = '${candidate.firstName} ${candidate.lastName}'.trim().toLowerCase();
      if (full == wanted) {
        student = candidate;
        break;
      }
    }
  }

  final total = _num(row['total_amount'] ?? row['totalAmount']);
  final paid = _num(row['amount_paid'] ?? row['amountPaid']);
  final balance = _num(row['balance_amount'] ?? row['balanceAmount']);
  final status = _text(row['payment_status'] ?? row['paymentStatus']);
  final className = student == null ? null : classNameById[student.classId];
  final companion = InvoicesCompanion(
    invoiceNumber: Value(number),
    dateCreated: Value(_date(row['created_at'] ?? row['dateCreated'])),
    subtotal: Value(_num(row['subtotal'] ?? total)),
    taxAmount: Value(_num(row['tax_amount'] ?? row['taxAmount'])),
    discountAmount: Value(_num(row['discount_amount'] ?? row['discountAmount'])),
    totalAmount: Value(total),
    paymentStatus: Value(status.isEmpty ? 'Unpaid' : status),
    amountPaid: Value(paid),
    balanceAmount: Value(balance == 0 && total > paid ? total - paid : balance),
    customerName: Value(studentName.isEmpty
        ? (student == null ? null : '${student.firstName} ${student.lastName}'.trim())
        : studentName),
    paymentMethod: Value(_text(row['payment_method'] ?? row['paymentMethod']).isEmpty
        ? null
        : _text(row['payment_method'] ?? row['paymentMethod'])),
    businessMode: const Value('school'),
    studentId: Value(student?.id),
    classId: Value(student?.classId),
    admissionNumber: Value(admission.isEmpty ? student?.admissionNumber : admission),
    className: Value(className),
    syncId: Value(cloudId.isEmpty ? null : cloudId),
    updatedAt: Value(DateTime.now()),
  );

  var existing = await (db.select(db.invoices)..where((t) => t.invoiceNumber.equals(number))).get();
  if (existing.isEmpty && cloudId.isNotEmpty) {
    existing = await (db.select(db.invoices)..where((t) => t.syncId.equals(cloudId))).get();
  }
  final int invoiceId;
  if (existing.isNotEmpty) {
    invoiceId = existing.first.id;
    await (db.update(db.invoices)..where((t) => t.id.equals(invoiceId))).write(companion);
    await (db.delete(db.invoiceItems)..where((t) => t.invoiceId.equals(invoiceId))).go();
  } else {
    invoiceId = await db.into(db.invoices).insert(companion);
  }

  final lines = _rows(row['items']);
  if (lines.isEmpty && total > 0) {
    final feeId = await _upsertSchoolFee(
      db,
      {'name': 'School bill', 'price': total, 'type': 'service'},
      catalog: false,
    );
    if (feeId != null) {
      await db.into(db.invoiceItems).insert(InvoiceItemsCompanion.insert(
            invoiceId: invoiceId,
            itemId: feeId,
            quantity: 1,
            unitPrice: total,
            type: const Value('service'),
          ));
    }
    return true;
  }

  for (final line in lines) {
    final name = _text(line['name'] ?? line['itemName']);
    if (name.isEmpty) continue;
    var itemId = _lookup(feeIds, line['item_id'] ?? line['itemId']);
    itemId ??= await _upsertSchoolFee(
      db,
      {
        'id': line['item_id'] ?? line['itemId'],
        'name': name,
        'price': line['unit_price'] ?? line['unitPrice'],
        'type': line['type'] ?? 'service',
      },
      catalog: _isCatalogFee({
        'name': name,
        'type': line['type'] ?? 'service',
      }),
    );
    if (itemId == null) continue;
    await db.into(db.invoiceItems).insert(InvoiceItemsCompanion.insert(
          invoiceId: invoiceId,
          itemId: itemId,
          quantity: int.tryParse('${line['quantity'] ?? 1}') ?? 1,
          unitPrice: _num(line['unit_price'] ?? line['unitPrice']),
          type: Value(_text(line['type']).isEmpty ? 'service' : _text(line['type'])),
        ));
  }
  return true;
}

String _admissionFromBillNumber(String number) {
  final match = RegExp(r'^BILL-(.+)-(\d{10,})$').firstMatch(number.trim());
  return match?.group(1)?.trim() ?? '';
}

String? _remapIdList(dynamic raw, Map<String, int> index) {
  final text = _text(raw);
  if (text.isEmpty) return null;
  final mapped = text
      .split(',')
      .map((part) => _lookup(index, part.trim()))
      .whereType<int>()
      .join(',');
  return mapped.isEmpty ? null : mapped;
}
