import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class JobStaffAssignment {
  final int staffId;
  final String staffName;
  final DateTime assignedAt;

  const JobStaffAssignment({
    required this.staffId,
    required this.staffName,
    required this.assignedAt,
  });

  Map<String, dynamic> toJson() => {
        'staffId': staffId,
        'staffName': staffName,
        'assignedAt': assignedAt.toIso8601String(),
      };

  factory JobStaffAssignment.fromJson(Map<String, dynamic> json) {
    return JobStaffAssignment(
      staffId: (json['staffId'] as num).toInt(),
      staffName: json['staffName'] as String,
      assignedAt: DateTime.tryParse(json['assignedAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

class JobStaffStore {
  JobStaffStore._();

  static const _prefix = 'job_staff_assign_';
  static const _latestCreatedStaffKey = 'latest_created_job_staff';

  /// Saves the staff who created the latest job so it can be associated with the newly generated ID
  static Future<void> saveLatestStaff(int staffId, String staffName) async {
    final prefs = await SharedPreferences.getInstance();
    final assignment = JobStaffAssignment(
      staffId: staffId,
      staffName: staffName,
      assignedAt: DateTime.now(),
    );
    await prefs.setString(_latestCreatedStaffKey, jsonEncode(assignment.toJson()));
  }

  static Future<JobStaffAssignment?> getLatestStaff() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_latestCreatedStaffKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      final map = jsonDecode(raw);
      if (map is Map<String, dynamic>) {
        return JobStaffAssignment.fromJson(map);
      }
    } catch (_) {}
    return null;
  }

  static Future<void> assignStaff(String jobId, int staffId, String staffName) async {
    final prefs = await SharedPreferences.getInstance();
    final assignment = JobStaffAssignment(
      staffId: staffId,
      staffName: staffName,
      assignedAt: DateTime.now(),
    );
    final val = jsonEncode(assignment.toJson());
    await prefs.setString('$_prefix$jobId', val);
  }

  static Future<JobStaffAssignment?> getAssignment(String jobId) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_prefix$jobId');
    if (raw == null || raw.isEmpty) return null;
    try {
      final map = jsonDecode(raw);
      if (map is Map) {
        return JobStaffAssignment.fromJson(Map<String, dynamic>.from(map));
      }
    } catch (_) {}
    return null;
  }
}
