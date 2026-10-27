// lib/features/school/data/services/attendance_api_service.dart
import 'package:get_it/get_it.dart';
import '../../../../core/services/finance_api_client.dart';
import '../../domain/entities/attendance_models.dart';

class AttendanceApiService {
  final FinanceApiClient _client;

  AttendanceApiService({FinanceApiClient? client})
      : _client = client ?? GetIt.instance<FinanceApiClient>();

  /// Fetch digital register for a class on a specific date.
  Future<AttendanceRegisterData> getRegister({
    required String className,
    required String date,
    String? subjectName,
  }) async {
    try {
      final response = await _client.get(
        '/attendance/register',
        queryParameters: {
          'className': className,
          'date': date,
          if (subjectName != null && subjectName.isNotEmpty) 'subjectName': subjectName,
        },
      );
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return AttendanceRegisterData.fromJson(data);
      }
      return AttendanceRegisterData(
        className: className,
        date: date,
        isFinalized: false,
        students: const [],
      );
    } catch (_) {
      // Graceful fallback for non-existent session/404 or empty network response
      return AttendanceRegisterData(
        className: className,
        date: date,
        isFinalized: false,
        students: const [],
      );
    }
  }

  /// Save register (as draft or finalized).
  Future<Map<String, dynamic>> saveRegister({
    required String className,
    required String date,
    required List<AttendanceStudent> students,
    String? teacherId,
    String? teacherName,
    String? subjectName,
    String? academicYear,
    String? term,
    bool finalize = false,
  }) async {
    final entries = students
        .where((s) => s.status != AttendanceStatus.unrecorded)
        .map((s) => {
              'studentId': s.id,
              'status': s.status.toApiString(),
              if (s.notes.isNotEmpty) 'notes': s.notes,
            })
        .toList();

    final response = await _client.post(
      '/attendance/save',
      data: {
        'className': className,
        'date': date,
        if (teacherId != null) 'teacherId': teacherId,
        if (teacherName != null) 'teacherName': teacherName,
        if (subjectName != null) 'subjectName': subjectName,
        if (academicYear != null) 'academicYear': academicYear,
        if (term != null) 'term': term,
        'status': finalize ? 'finalized' : 'draft',
        'entries': entries,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  /// Bulk mark present for a list of student IDs.
  Future<Map<String, dynamic>> bulkPresent({
    required String className,
    required List<String> studentIds,
    required String date,
    String? teacherName,
    String? subjectName,
  }) async {
    final response = await _client.post(
      '/attendance/bulk-present',
      data: {
        'className': className,
        'studentIds': studentIds,
        'date': date,
        if (teacherName != null) 'teacherName': teacherName,
        if (subjectName != null) 'subjectName': subjectName,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  /// Submit an audited correction on a finalized register session.
  Future<Map<String, dynamic>> correctEntry({
    required String sessionId,
    required String studentId,
    required AttendanceStatus newStatus,
    required String reason,
  }) async {
    final response = await _client.post(
      '/attendance/correct',
      data: {
        'sessionId': sessionId,
        'studentId': studentId,
        'newStatus': newStatus.toApiString(),
        'reason': reason,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  /// Get class attendance report (KPI cards, monthly rates, threshold flags).
  Future<ClassAttendanceReport> getClassReport({
    required String className,
    required String periodFrom,
    required String periodTo,
    String? subjectName,
  }) async {
    final response = await _client.get(
      '/attendance/report',
      queryParameters: {
        'className': className,
        'periodFrom': periodFrom,
        'periodTo': periodTo,
        if (subjectName != null && subjectName.isNotEmpty) 'subjectName': subjectName,
      },
    );
    final data = response.data;
    if (data is Map<String, dynamic>) {
      return ClassAttendanceReport.fromJson(data);
    }
    throw Exception('Invalid report response structure');
  }

  /// Get attendance history for a single student.
  Future<Map<String, dynamic>> getStudentHistory({
    required String studentId,
    String? periodFrom,
    String? periodTo,
  }) async {
    final response = await _client.get(
      '/attendance/student-history/$studentId',
      queryParameters: {
        if (periodFrom != null) 'periodFrom': periodFrom,
        if (periodTo != null) 'periodTo': periodTo,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  /// Fetch teacher class assignments for permission restrictions.
  Future<List<Map<String, dynamic>>> getAssignments() async {
    final response = await _client.get('/attendance/assignments');
    final data = response.data;
    if (data is List) {
      return data.cast<Map<String, dynamic>>();
    }
    return [];
  }

  /// Fetch attendance settings (e.g. threshold percentage).
  Future<Map<String, dynamic>> getSettings() async {
    final response = await _client.get('/attendance/settings');
    return response.data as Map<String, dynamic>;
  }

  /// Fetch list of students in a class.
  Future<List<AttendanceStudent>> getStudentsByClass(String className) async {
    final response = await _client.get(
      '/attendance/students',
      queryParameters: {'className': className},
    );
    final data = response.data;
    if (data is List) {
      return data.map((item) => AttendanceStudent.fromJson(item as Map<String, dynamic>)).toList();
    }
    return [];
  }

  /// Fetch all historical attendance sessions for the tenant.
  Future<List<Map<String, dynamic>>> getHistory() async {
    final response = await _client.get('/attendance/history');
    final data = response.data;
    if (data is List) {
      return data.cast<Map<String, dynamic>>();
    }
    return [];
  }

  /// Fetch attendance audit log entries.
  Future<List<Map<String, dynamic>>> getAuditLog() async {
    final response = await _client.get('/attendance/audit-log');
    final data = response.data;
    if (data is List) {
      return data.cast<Map<String, dynamic>>();
    }
    return [];
  }
}
