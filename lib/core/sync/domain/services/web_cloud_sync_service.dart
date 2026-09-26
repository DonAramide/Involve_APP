import 'package:flutter/foundation.dart';
import 'package:get_it/get_it.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/core/utils/app_config.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';
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
}
