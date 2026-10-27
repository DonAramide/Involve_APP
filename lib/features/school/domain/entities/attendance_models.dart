// lib/features/school/domain/entities/attendance_models.dart
import 'package:equatable/equatable.dart';

enum AttendanceStatus {
  present,
  absent,
  late,
  excused,
  unrecorded;

  static AttendanceStatus fromString(String? val) {
    if (val == null) return AttendanceStatus.unrecorded;
    switch (val.toLowerCase().trim()) {
      case 'present':
        return AttendanceStatus.present;
      case 'absent':
        return AttendanceStatus.absent;
      case 'late':
        return AttendanceStatus.late;
      case 'excused':
        return AttendanceStatus.excused;
      default:
        return AttendanceStatus.unrecorded;
    }
  }

  String toApiString() {
    switch (this) {
      case AttendanceStatus.present:
        return 'present';
      case AttendanceStatus.absent:
        return 'absent';
      case AttendanceStatus.late:
        return 'late';
      case AttendanceStatus.excused:
        return 'excused';
      case AttendanceStatus.unrecorded:
        return '';
    }
  }

  String get shortLabel {
    switch (this) {
      case AttendanceStatus.present:
        return 'P';
      case AttendanceStatus.absent:
        return 'A';
      case AttendanceStatus.late:
        return 'L';
      case AttendanceStatus.excused:
        return 'E';
      case AttendanceStatus.unrecorded:
        return '-';
    }
  }
}

class AttendanceStudent extends Equatable {
  final String id;
  final String fullName;
  final String admissionNumber;
  final String currentClass;
  final AttendanceStatus status;
  final String notes;

  const AttendanceStudent({
    required this.id,
    required this.fullName,
    required this.admissionNumber,
    required this.currentClass,
    this.status = AttendanceStatus.unrecorded,
    this.notes = '',
  });

  AttendanceStudent copyWith({
    String? id,
    String? fullName,
    String? admissionNumber,
    String? currentClass,
    AttendanceStatus? status,
    String? notes,
  }) {
    return AttendanceStudent(
      id: id ?? this.id,
      fullName: fullName ?? this.fullName,
      admissionNumber: admissionNumber ?? this.admissionNumber,
      currentClass: currentClass ?? this.currentClass,
      status: status ?? this.status,
      notes: notes ?? this.notes,
    );
  }

  factory AttendanceStudent.fromJson(Map<String, dynamic> json) {
    return AttendanceStudent(
      id: json['id']?.toString() ?? '',
      fullName: json['full_name']?.toString() ?? json['fullName']?.toString() ?? 'Student',
      admissionNumber: json['admission_number']?.toString() ?? json['admissionNumber']?.toString() ?? '',
      currentClass: json['current_class']?.toString() ?? json['className']?.toString() ?? '',
      status: AttendanceStatus.fromString(json['status']?.toString()),
      notes: json['notes']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fullName': fullName,
      'admissionNumber': admissionNumber,
      'currentClass': currentClass,
      'status': status.toApiString(),
      'notes': notes,
    };
  }

  @override
  List<Object?> get props => [id, fullName, admissionNumber, currentClass, status, notes];
}

class AttendanceRegisterData extends Equatable {
  final String? sessionId;
  final String className;
  final String date;
  final String? teacherName;
  final String? subjectName;
  final bool isFinalized;
  final List<AttendanceStudent> students;

  const AttendanceRegisterData({
    this.sessionId,
    required this.className,
    required this.date,
    this.teacherName,
    this.subjectName,
    required this.isFinalized,
    required this.students,
  });

  AttendanceRegisterData copyWith({
    String? sessionId,
    String? className,
    String? date,
    String? teacherName,
    String? subjectName,
    bool? isFinalized,
    List<AttendanceStudent>? students,
  }) {
    return AttendanceRegisterData(
      sessionId: sessionId ?? this.sessionId,
      className: className ?? this.className,
      date: date ?? this.date,
      teacherName: teacherName ?? this.teacherName,
      subjectName: subjectName ?? this.subjectName,
      isFinalized: isFinalized ?? this.isFinalized,
      students: students ?? this.students,
    );
  }

  factory AttendanceRegisterData.fromJson(Map<String, dynamic> json) {
    final studentsList = (json['students'] as List<dynamic>? ?? [])
        .map((s) => AttendanceStudent.fromJson(s as Map<String, dynamic>))
        .toList();

    final session = json['session'] as Map<String, dynamic>?;

    return AttendanceRegisterData(
      sessionId: session?['id']?.toString() ?? json['sessionId']?.toString(),
      className: json['className']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      teacherName: session?['teacher_name']?.toString() ?? json['teacherName']?.toString(),
      subjectName: json['subjectName']?.toString() ?? session?['subject_name']?.toString(),
      isFinalized: json['isFinalized'] == true || session?['status'] == 'finalized',
      students: studentsList,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sessionId': sessionId,
      'className': className,
      'date': date,
      'teacherName': teacherName,
      'subjectName': subjectName,
      'isFinalized': isFinalized,
      'students': students.map((s) => s.toJson()).toList(),
    };
  }

  @override
  List<Object?> get props => [sessionId, className, date, teacherName, subjectName, isFinalized, students];
}

class MonthSummaryItem extends Equatable {
  final String month;
  final int instructionalDays;
  final double? ratePercent;

  const MonthSummaryItem({
    required this.month,
    required this.instructionalDays,
    this.ratePercent,
  });

  factory MonthSummaryItem.fromJson(Map<String, dynamic> json) {
    return MonthSummaryItem(
      month: json['month']?.toString() ?? '',
      instructionalDays: (json['instructionalDays'] as num?)?.toInt() ?? 0,
      ratePercent: (json['ratePercent'] as num?)?.toDouble(),
    );
  }

  @override
  List<Object?> get props => [month, instructionalDays, ratePercent];
}

class StudentReportItem extends Equatable {
  final String studentId;
  final String studentName;
  final String admissionNumber;
  final double? overallRate;
  final bool belowThreshold;
  final Map<String, double?> monthlyRates;

  const StudentReportItem({
    required this.studentId,
    required this.studentName,
    required this.admissionNumber,
    this.overallRate,
    required this.belowThreshold,
    required this.monthlyRates,
  });

  factory StudentReportItem.fromJson(Map<String, dynamic> json) {
    final monthsMap = <String, double?>{};
    final rawMonths = json['months'] as Map<String, dynamic>? ?? {};
    rawMonths.forEach((key, val) {
      if (val is Map) {
        monthsMap[key] = (val['ratePercent'] as num?)?.toDouble();
      } else if (val is num) {
        monthsMap[key] = val.toDouble();
      }
    });

    final overall = json['overall'] as Map<String, dynamic>?;
    final overallRate = (overall?['ratePercent'] as num?)?.toDouble() ??
        (json['overallRate'] as num?)?.toDouble();

    return StudentReportItem(
      studentId: json['studentId']?.toString() ?? '',
      studentName: json['studentName']?.toString() ?? 'Student',
      admissionNumber: json['admissionNumber']?.toString() ?? '',
      overallRate: overallRate,
      belowThreshold: json['belowThreshold'] == true,
      monthlyRates: monthsMap,
    );
  }

  @override
  List<Object?> get props => [studentId, studentName, admissionNumber, overallRate, belowThreshold, monthlyRates];
}

class ClassAttendanceReport extends Equatable {
  final String schoolName;
  final String? teacherName;
  final String periodFrom;
  final String periodTo;
  final int enrolledStudents;
  final int instructionalDays;
  final double? overallRate;
  final double thresholdPercent;
  final int belowThresholdCount;
  final List<MonthSummaryItem> months;
  final List<StudentReportItem> students;

  const ClassAttendanceReport({
    required this.schoolName,
    this.teacherName,
    required this.periodFrom,
    required this.periodTo,
    required this.enrolledStudents,
    required this.instructionalDays,
    this.overallRate,
    required this.thresholdPercent,
    required this.belowThresholdCount,
    required this.months,
    required this.students,
  });

  factory ClassAttendanceReport.fromJson(Map<String, dynamic> json) {
    final overallObj = json['overall'] as Map<String, dynamic>?;
    final overallRate = (overallObj?['ratePercent'] as num?)?.toDouble();

    final monthsList = (json['months'] as List<dynamic>? ?? [])
        .map((m) => MonthSummaryItem.fromJson(m as Map<String, dynamic>))
        .toList();

    final studentsList = (json['students'] as List<dynamic>? ?? [])
        .map((s) => StudentReportItem.fromJson(s as Map<String, dynamic>))
        .toList();

    return ClassAttendanceReport(
      schoolName: json['schoolName']?.toString() ?? 'School',
      teacherName: json['teacherName']?.toString(),
      periodFrom: json['periodFrom']?.toString() ?? '',
      periodTo: json['periodTo']?.toString() ?? '',
      enrolledStudents: (json['enrolledStudents'] as num?)?.toInt() ?? 0,
      instructionalDays: (json['instructionalDays'] as num?)?.toInt() ?? 0,
      overallRate: overallRate,
      thresholdPercent: (json['thresholdPercent'] as num?)?.toDouble() ?? 80.0,
      belowThresholdCount: (json['belowThresholdCount'] as num?)?.toInt() ?? 0,
      months: monthsList,
      students: studentsList,
    );
  }

  @override
  List<Object?> get props => [
        schoolName,
        teacherName,
        periodFrom,
        periodTo,
        enrolledStudents,
        instructionalDays,
        overallRate,
        thresholdPercent,
        belowThresholdCount,
        months,
        students,
      ];
}

class DailyAttendanceLog extends Equatable {
  final String id;
  final String date;
  final AttendanceStatus status;
  final String? className;
  final String? subjectName;
  final String? teacherName;
  final String notes;

  const DailyAttendanceLog({
    required this.id,
    required this.date,
    required this.status,
    this.className,
    this.subjectName,
    this.teacherName,
    required this.notes,
  });

  factory DailyAttendanceLog.fromJson(Map<String, dynamic> json) {
    return DailyAttendanceLog(
      id: json['id']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      status: AttendanceStatus.fromString(json['status']?.toString()),
      className: json['className']?.toString(),
      subjectName: json['subjectName']?.toString(),
      teacherName: json['teacherName']?.toString(),
      notes: json['notes']?.toString() ?? '',
    );
  }

  @override
  List<Object?> get props => [id, date, status, className, subjectName, teacherName, notes];
}

class StudentAttendanceSummary extends Equatable {
  final int totalDays;
  final int present;
  final int absent;
  final int lateCount;
  final int excused;
  final double? ratePercent;

  const StudentAttendanceSummary({
    required this.totalDays,
    required this.present,
    required this.absent,
    required this.lateCount,
    this.excused = 0,
    this.ratePercent,
  });

  factory StudentAttendanceSummary.empty() {
    return const StudentAttendanceSummary(
      totalDays: 0,
      present: 0,
      absent: 0,
      lateCount: 0,
      excused: 0,
      ratePercent: null,
    );
  }

  String get formattedRate => ratePercent != null ? '${ratePercent!.toStringAsFixed(1)}%' : 'N/A';

  @override
  List<Object?> get props => [totalDays, present, absent, lateCount, excused, ratePercent];
}
