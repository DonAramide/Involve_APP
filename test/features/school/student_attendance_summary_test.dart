import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:involve_app/features/school/domain/entities/attendance_models.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/school/domain/services/result_service.dart';
import 'package:involve_app/features/school/data/services/attendance_local_storage.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:involve_app/features/invoicing/domain/templates/invoice_template.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('StudentAttendanceSummary Unit Tests', () {
    test('calculates correct attendance metrics and percentage format', () {
      const summary = StudentAttendanceSummary(
        totalDays: 20,
        present: 16,
        absent: 2,
        lateCount: 2,
        excused: 0,
        ratePercent: 90.0,
      );

      expect(summary.totalDays, 20);
      expect(summary.present, 16);
      expect(summary.absent, 2);
      expect(summary.lateCount, 2);
      expect(summary.formattedRate, '90.0%');
    });

    test('handles empty attendance summary cleanly', () {
      final summary = StudentAttendanceSummary.empty();

      expect(summary.totalDays, 0);
      expect(summary.present, 0);
      expect(summary.absent, 0);
      expect(summary.lateCount, 0);
      expect(summary.formattedRate, 'N/A');
    });

    test('computes student summary from local on-device registers correctly', () async {
      const student1 = AttendanceStudent(
        id: '101',
        fullName: 'Aisha Bello',
        admissionNumber: 'ADM-101',
        currentClass: 'JSS1',
        status: AttendanceStatus.present,
      );

      const regDay1 = AttendanceRegisterData(
        className: 'JSS1',
        date: '2026-10-01',
        isFinalized: true,
        students: [student1],
      );

      const regDay2 = AttendanceRegisterData(
        className: 'JSS1',
        date: '2026-10-02',
        isFinalized: true,
        students: [
          AttendanceStudent(
            id: '101',
            fullName: 'Aisha Bello',
            admissionNumber: 'ADM-101',
            currentClass: 'JSS1',
            status: AttendanceStatus.late,
          ),
        ],
      );

      const regDay3 = AttendanceRegisterData(
        className: 'JSS1',
        date: '2026-10-03',
        isFinalized: true,
        students: [
          AttendanceStudent(
            id: '101',
            fullName: 'Aisha Bello',
            admissionNumber: 'ADM-101',
            currentClass: 'JSS1',
            status: AttendanceStatus.absent,
          ),
        ],
      );

      await AttendanceLocalStorage.saveRegister(register: regDay1);
      await AttendanceLocalStorage.saveRegister(register: regDay2);
      await AttendanceLocalStorage.saveRegister(register: regDay3);

      final summary = await AttendanceLocalStorage.computeStudentSummary(
        studentId: '101',
        studentName: 'Aisha Bello',
        className: 'JSS1',
        admissionNumber: 'ADM-101',
      );

      expect(summary.totalDays, 3);
      expect(summary.present, 1);
      expect(summary.lateCount, 1);
      expect(summary.absent, 1);
      // Attended = present (1) + late (1) = 2. Total attended + absent = 3. 2/3 = 66.7%
      expect(summary.ratePercent, 66.7);
      expect(summary.formattedRate, '66.7%');
    });

    test('ResultService generates thermal commands with attendance record', () {
      final student = Student(
        id: 1,
        admissionNumber: 'ADM-101',
        firstName: 'Aisha',
        lastName: 'Bello',
        classId: 1,
        registrationDate: DateTime.now(),
      );

      const summary = StudentAttendanceSummary(
        totalDays: 25,
        present: 23,
        absent: 1,
        lateCount: 1,
        ratePercent: 96.0,
      );

      const settings = AppSettings(
        organizationName: 'Test Academy',
        address: '123 Test St',
        phone: '08012345678',
      );

      final commands = ResultService().generateResultThermalCommands(
        student: student,
        results: const [],
        subjects: const [],
        settings: settings,
        className: 'JSS1',
        attendanceSummary: summary,
      );

      final textCommands = commands.whereType<TextCommand>().map((c) => c.text).toList();
      expect(textCommands.any((t) => t.contains('ATTENDANCE RECORD')), isTrue);
      expect(textCommands.any((t) => t.contains('Total Attendance: 25 days')), isTrue);
      expect(textCommands.any((t) => t.contains('Present: 23')), isTrue);
      expect(textCommands.any((t) => t.contains('Attendance Rate: 96.0%')), isTrue);
    });
  });
}
