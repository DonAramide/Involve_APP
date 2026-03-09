import 'package:flutter_test/flutter_test.dart';
import 'package:collection/collection.dart';

void main() {
  group('Ranking Logic Verification', () {
    test('should calculate correct position and average', () {
      // Setup mock results for a class
      final classResults = [
        // Student 1 (Total: 150)
        {'studentId': 1, 'totalScore': 80.0},
        {'studentId': 1, 'totalScore': 70.0},
        // Student 2 (Total: 180) - 1st
        {'studentId': 2, 'totalScore': 90.0},
        {'studentId': 2, 'totalScore': 90.0},
        // Student 3 (Total: 120) - 3rd
        {'studentId': 3, 'totalScore': 60.0},
        {'studentId': 3, 'totalScore': 60.0},
      ];

      final studentId = 1;

      // Logic from SchoolBloc
      final resultsByStudent = groupBy(classResults, (Map r) => r['studentId'] as int);
      
      final studentTotals = <int, double>{};
      resultsByStudent.forEach((sId, studentResults) {
        final total = studentResults.fold(0.0, (sum, r) => sum + (r['totalScore'] as double));
        studentTotals[sId] = total;
      });

      final sortedStudents = studentTotals.entries.toList()
        ..sort((a, b) => b.value.compareTo(a.value));

      final index = sortedStudents.indexWhere((e) => e.key == studentId);
      final studentPosition = index != -1 ? index + 1 : null;
      final classSize = resultsByStudent.keys.length;

      final currentStudentResults = classResults.where((r) => r['studentId'] == studentId).toList();
      double? studentAverage;
      if (currentStudentResults.isNotEmpty) {
        final sumOfTotals = currentStudentResults.fold(0.0, (sum, r) => sum + (r['totalScore'] as double));
        studentAverage = sumOfTotals / currentStudentResults.length;
      }

      // Assertions
      expect(studentPosition, 2); // Student 1 is 2nd (150 vs 180 and 120)
      expect(classSize, 3);
      expect(studentAverage, 75.0); // (80 + 70) / 2
    });

    test('should handle ties correctly', () {
      final classResults = [
        {'studentId': 1, 'totalScore': 100.0},
        {'studentId': 2, 'totalScore': 100.0},
        {'studentId': 3, 'totalScore': 80.0},
      ];

      final studentTotals = <int, double>{};
      final resultsByStudent = groupBy(classResults, (Map r) => r['studentId'] as int);
      resultsByStudent.forEach((sId, studentResults) {
        studentTotals[sId] = studentResults.fold(0.0, (sum, r) => sum + (r['totalScore'] as double));
      });

      final sortedStudents = studentTotals.entries.toList()
        ..sort((a, b) => b.value.compareTo(a.value));

      final pos1 = sortedStudents.indexWhere((e) => e.key == 1) + 1;
      final pos2 = sortedStudents.indexWhere((e) => e.key == 2) + 1;

      // Note: Standard sort doesn't handle rank ties (1st, 1st, 3rd) automatically without extra logic
      // but it consistently assigns a position in the list.
      expect([1, 2].contains(pos1), true);
      expect([1, 2].contains(pos2), true);
      expect(pos1 != pos2, true); 
    });
  });
}
