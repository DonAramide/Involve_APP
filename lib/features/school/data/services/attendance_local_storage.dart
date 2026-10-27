import 'dart:convert';
import 'package:collection/collection.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../domain/entities/attendance_models.dart';
import 'attendance_api_service.dart';

class AttendanceLocalStorage {
  static const String _keyPrefix = 'invify_att_reg_';
  static const String _keysIndex = 'invify_att_all_keys';
  static const String _pendingSyncKeys = 'invify_att_pending_sync_keys';
  static const String _pendingCorrectionsKey = 'invify_att_pending_corrections';

  static String _norm(String val) => val.trim().toLowerCase().replaceAll(RegExp(r'\s+'), '_');

  static String _buildKey(String className, String date, [String? subjectName]) {
    final s = subjectName != null && subjectName.isNotEmpty ? _norm(subjectName) : 'all';
    return '$_keyPrefix${_norm(className)}_${date}_$s';
  }

  /// Save register locally on the device (Offline-First).
  static Future<void> saveRegister({
    required AttendanceRegisterData register,
    bool isSynced = false,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final key = _buildKey(register.className, register.date, register.subjectName);

    final payload = {
      'register': register.toJson(),
      'isSynced': isSynced,
      'updatedAt': DateTime.now().toIso8601String(),
    };

    await prefs.setString(key, jsonEncode(payload));

    // Update master keys index
    final allKeys = prefs.getStringList(_keysIndex) ?? [];
    if (!allKeys.contains(key)) {
      allKeys.add(key);
      await prefs.setStringList(_keysIndex, allKeys);
    }

    // Update pending sync list
    final pending = prefs.getStringList(_pendingSyncKeys) ?? [];
    if (!isSynced) {
      if (!pending.contains(key)) {
        pending.add(key);
        await prefs.setStringList(_pendingSyncKeys, pending);
      }
    } else {
      pending.remove(key);
      await prefs.setStringList(_pendingSyncKeys, pending);
    }
  }

  /// Retrieve register from local device storage.
  static Future<AttendanceRegisterData?> getRegister({
    required String className,
    required String date,
    String? subjectName,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final key = _buildKey(className, date, subjectName);
    final raw = prefs.getString(key);
    if (raw == null) return null;

    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      final regMap = decoded['register'] as Map<String, dynamic>? ?? decoded;
      return AttendanceRegisterData.fromJson(regMap);
    } catch (_) {
      return null;
    }
  }

  /// Check if a register is synced with cloud.
  static Future<bool> isRegisterSynced({
    required String className,
    required String date,
    String? subjectName,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final key = _buildKey(className, date, subjectName);
    final raw = prefs.getString(key);
    if (raw == null) return true;
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      return decoded['isSynced'] == true;
    } catch (_) {
      return false;
    }
  }

  /// Get all local registers for a class (used for local report calculation).
  static Future<List<AttendanceRegisterData>> getRegistersForClass(String className) async {
    final prefs = await SharedPreferences.getInstance();
    final allKeys = prefs.getStringList(_keysIndex) ?? [];
    final targetClassNorm = _norm(className);

    final list = <AttendanceRegisterData>[];
    for (final k in allKeys) {
      if (k.startsWith('$_keyPrefix${targetClassNorm}_')) {
        final raw = prefs.getString(k);
        if (raw != null) {
          try {
            final decoded = jsonDecode(raw) as Map<String, dynamic>;
            final regMap = decoded['register'] as Map<String, dynamic>? ?? decoded;
            list.add(AttendanceRegisterData.fromJson(regMap));
          } catch (_) {}
        }
      }
    }
    list.sort((a, b) => a.date.compareTo(b.date));
    return list;
  }

  /// Compute Class Attendance Report directly from on-device records (100% offline).
  static Future<ClassAttendanceReport?> computeLocalReport({
    required String className,
    String schoolName = 'School',
    double thresholdPercent = 80.0,
  }) async {
    final registers = await getRegistersForClass(className);
    if (registers.isEmpty) return null;

    final studentMap = <String, AttendanceStudent>{};
    final studentStats = <String, Map<String, int>>{}; // id -> {attended, possible}
    final monthStats = <String, Map<String, int>>{}; // YYYY-MM -> {attended, possible}

    int totalInstructionalDays = 0;
    final datesSeen = <String>{};

    for (final reg in registers) {
      if (!datesSeen.contains(reg.date)) {
        datesSeen.add(reg.date);
        totalInstructionalDays++;
      }

      final monthKey = reg.date.length >= 7 ? reg.date.substring(0, 7) : 'Current';
      monthStats.putIfAbsent(monthKey, () => {'attended': 0, 'possible': 0});

      for (final s in reg.students) {
        studentMap[s.id] = s;
        studentStats.putIfAbsent(s.id, () => {'attended': 0, 'possible': 0});

        if (s.status == AttendanceStatus.present || s.status == AttendanceStatus.late) {
          studentStats[s.id]!['attended'] = studentStats[s.id]!['attended']! + 1;
          studentStats[s.id]!['possible'] = studentStats[s.id]!['possible']! + 1;
          monthStats[monthKey]!['attended'] = monthStats[monthKey]!['attended']! + 1;
          monthStats[monthKey]!['possible'] = monthStats[monthKey]!['possible']! + 1;
        } else if (s.status == AttendanceStatus.absent) {
          studentStats[s.id]!['possible'] = studentStats[s.id]!['possible']! + 1;
          monthStats[monthKey]!['possible'] = monthStats[monthKey]!['possible']! + 1;
        }
      }
    }

    int belowThresholdCount = 0;
    final reportStudents = <StudentReportItem>[];

    studentStats.forEach((id, st) {
      final attended = st['attended'] ?? 0;
      final possible = st['possible'] ?? 0;
      final rate = possible > 0 ? (attended / possible) * 100.0 : null;
      final isBelow = rate != null && rate < thresholdPercent;
      if (isBelow) belowThresholdCount++;

      final student = studentMap[id];
      reportStudents.add(
        StudentReportItem(
          studentId: id,
          studentName: student?.fullName ?? 'Student',
          admissionNumber: student?.admissionNumber ?? '',
          overallRate: rate != null ? double.parse(rate.toStringAsFixed(1)) : null,
          belowThreshold: isBelow,
          monthlyRates: {},
        ),
      );
    });

    reportStudents.sort((a, b) => a.studentName.compareTo(b.studentName));

    final monthItems = monthStats.entries.map((e) {
      final att = e.value['attended'] ?? 0;
      final pos = e.value['possible'] ?? 0;
      final rate = pos > 0 ? (att / pos) * 100.0 : null;
      return MonthSummaryItem(
        month: e.key,
        instructionalDays: totalInstructionalDays,
        ratePercent: rate != null ? double.parse(rate.toStringAsFixed(1)) : null,
      );
    }).toList();

    int totalAttendedAll = 0;
    int totalPossibleAll = 0;
    studentStats.values.forEach((v) {
      totalAttendedAll += v['attended'] ?? 0;
      totalPossibleAll += v['possible'] ?? 0;
    });
    final overallClassRate = totalPossibleAll > 0
        ? double.parse(((totalAttendedAll / totalPossibleAll) * 100.0).toStringAsFixed(1))
        : null;

    final sortedDates = datesSeen.toList()..sort();

    return ClassAttendanceReport(
      schoolName: schoolName,
      teacherName: registers.first.teacherName,
      periodFrom: sortedDates.isNotEmpty ? sortedDates.first : '',
      periodTo: sortedDates.isNotEmpty ? sortedDates.last : '',
      enrolledStudents: studentMap.length,
      instructionalDays: totalInstructionalDays,
      overallRate: overallClassRate,
      thresholdPercent: thresholdPercent,
      belowThresholdCount: belowThresholdCount,
      months: monthItems,
      students: reportStudents,
    );
  }

  /// Get pending registers to push to cloud upon sync.
  static Future<List<AttendanceRegisterData>> getPendingSyncRegisters() async {
    final prefs = await SharedPreferences.getInstance();
    final pendingKeys = prefs.getStringList(_pendingSyncKeys) ?? [];
    final list = <AttendanceRegisterData>[];
    for (final k in pendingKeys) {
      final raw = prefs.getString(k);
      if (raw != null) {
        try {
          final decoded = jsonDecode(raw) as Map<String, dynamic>;
          final regMap = decoded['register'] as Map<String, dynamic>? ?? decoded;
          list.add(AttendanceRegisterData.fromJson(regMap));
        } catch (_) {}
      }
    }
    return list;
  }

  /// Mark register as synced with cloud.
  static Future<void> markRegisterSynced(String className, String date, [String? subjectName]) async {
    final prefs = await SharedPreferences.getInstance();
    final key = _buildKey(className, date, subjectName);
    final raw = prefs.getString(key);
    if (raw != null) {
      try {
        final decoded = jsonDecode(raw) as Map<String, dynamic>;
        decoded['isSynced'] = true;
        await prefs.setString(key, jsonEncode(decoded));
      } catch (_) {}
    }

    final pending = prefs.getStringList(_pendingSyncKeys) ?? [];
    pending.remove(key);
    await prefs.setStringList(_pendingSyncKeys, pending);
  }

  /// Save audited correction locally.
  static Future<void> saveLocalCorrection(Map<String, dynamic> correction) async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_pendingCorrectionsKey) ?? [];
    list.add(jsonEncode({
      ...correction,
      'timestamp': DateTime.now().toIso8601String(),
    }));
    await prefs.setStringList(_pendingCorrectionsKey, list);
  }

  /// Count of pending items to sync with cloud.
  static Future<int> getPendingSyncCount() async {
    final prefs = await SharedPreferences.getInstance();
    final pendingRegs = prefs.getStringList(_pendingSyncKeys)?.length ?? 0;
    final pendingCorrs = prefs.getStringList(_pendingCorrectionsKey)?.length ?? 0;
    return pendingRegs + pendingCorrs;
  }

  /// Compute single student attendance summary directly from on-device local registers.
  static Future<StudentAttendanceSummary> computeStudentSummary({
    required String studentId,
    required String studentName,
    required String className,
    String? admissionNumber,
  }) async {
    final registers = await getRegistersForClass(className);
    if (registers.isEmpty) {
      return StudentAttendanceSummary.empty();
    }

    final targetId = studentId.trim().toLowerCase();
    final targetAdm = (admissionNumber ?? '').trim().toLowerCase();
    final targetName = studentName.trim().toLowerCase();

    int present = 0;
    int absent = 0;
    int lateCount = 0;
    int excused = 0;

    for (final reg in registers) {
      final entry = reg.students.firstWhereOrNull((s) {
        final sid = s.id.trim().toLowerCase();
        final adm = s.admissionNumber.trim().toLowerCase();
        final sName = s.fullName.trim().toLowerCase();

        return (targetId.isNotEmpty && (sid == targetId || adm == targetId)) ||
               (targetAdm.isNotEmpty && (adm == targetAdm || sid == targetAdm)) ||
               (targetName.isNotEmpty && sName == targetName);
      });

      if (entry != null && entry.status != AttendanceStatus.unrecorded) {
        switch (entry.status) {
          case AttendanceStatus.present:
            present++;
            break;
          case AttendanceStatus.absent:
            absent++;
            break;
          case AttendanceStatus.late:
            lateCount++;
            break;
          case AttendanceStatus.excused:
            excused++;
            break;
          case AttendanceStatus.unrecorded:
            break;
        }
      }
    }

    final attended = present + lateCount;
    final denominator = attended + absent;
    final rate = denominator > 0 ? ((attended / denominator) * 100.0) : null;
    final totalDays = present + absent + lateCount + excused;

    return StudentAttendanceSummary(
      totalDays: totalDays,
      present: present,
      absent: absent,
      lateCount: lateCount,
      excused: excused,
      ratePercent: rate != null ? double.parse(rate.toStringAsFixed(1)) : null,
    );
  }

  /// Get student summary attempting cloud first with automatic local fallback (Offline-First).
  static Future<StudentAttendanceSummary> getStudentSummaryOnlineOffline({
    required String studentId,
    required String studentName,
    required String className,
    String? admissionNumber,
  }) async {
    final localSummary = await computeStudentSummary(
      studentId: studentId,
      studentName: studentName,
      className: className,
      admissionNumber: admissionNumber,
    );

    // If studentId is non-empty, attempt to query cloud history
    try {
      final apiService = AttendanceApiService();
      final cloudData = await apiService.getStudentHistory(
        studentId: studentId,
        periodFrom: DateFormat('yyyy-MM-dd').format(DateTime.now().subtract(const Duration(days: 180))),
        periodTo: DateFormat('yyyy-MM-dd').format(DateTime.now()),
      );

      final rawLogs = (cloudData['dailyLogs'] ?? cloudData['logs']) as List<dynamic>? ?? [];
      final logs = rawLogs
          .map((l) => DailyAttendanceLog.fromJson(l as Map<String, dynamic>))
          .toList();

      final presentFromLogs = logs.where((l) => l.status == AttendanceStatus.present).length;
      final absentFromLogs = logs.where((l) => l.status == AttendanceStatus.absent).length;
      final lateFromLogs = logs.where((l) => l.status == AttendanceStatus.late).length;
      final excusedFromLogs = logs.where((l) => l.status == AttendanceStatus.excused).length;

      final summaryOverall = (cloudData['summary'] as Map<String, dynamic>?)?['overall'] as Map<String, dynamic>?;
      final summaryCounts = summaryOverall?['counts'] as Map<String, dynamic>?;
      final metrics = cloudData['metrics'] as Map<String, dynamic>?;

      int present = (summaryCounts?['present'] as num?)?.toInt() ??
          (metrics?['presentDays'] as num?)?.toInt() ??
          presentFromLogs;

      int absent = (summaryCounts?['absent'] as num?)?.toInt() ??
          (metrics?['absentDays'] as num?)?.toInt() ??
          absentFromLogs;

      int lateCount = (summaryCounts?['late'] as num?)?.toInt() ??
          (metrics?['lateDays'] as num?)?.toInt() ??
          lateFromLogs;

      int excused = (summaryCounts?['excused'] as num?)?.toInt() ??
          (metrics?['excusedDays'] as num?)?.toInt() ??
          excusedFromLogs;

      if (present == 0 && absent == 0 && lateCount == 0 && excused == 0 && logs.isNotEmpty) {
        present = presentFromLogs;
        absent = absentFromLogs;
        lateCount = lateFromLogs;
        excused = excusedFromLogs;
      }

      double? rate = (summaryOverall?['ratePercent'] as num?)?.toDouble() ??
          (metrics?['ratePercent'] as num?)?.toDouble();

      final denominator = present + lateCount + absent;
      if (rate == null && denominator > 0) {
        rate = ((present + lateCount) / denominator) * 100.0;
      }

      final totalDays = present + absent + lateCount + excused;
      final cloudSummary = StudentAttendanceSummary(
        totalDays: totalDays,
        present: present,
        absent: absent,
        lateCount: lateCount,
        excused: excused,
        ratePercent: rate != null ? double.parse(rate.toStringAsFixed(1)) : null,
      );

      // Prefer the richer dataset: if local has more or equal days, prefer local (offline-first edits)
      if (localSummary.totalDays >= cloudSummary.totalDays && localSummary.totalDays > 0) {
        return localSummary;
      }
      if (cloudSummary.totalDays > 0) {
        return cloudSummary;
      }
    } catch (_) {
      // Cloud unreachable or returned error, localSummary will be used
    }

    return localSummary;
  }
}
