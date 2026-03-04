import 'package:equatable/equatable.dart';

class AcademicResult extends Equatable {
  final int? id;
  final int studentId;
  final int subjectId;
  final int termId;
  final int academicYearId;
  final double assessmentScore;
  final double examScore;
  final double totalScore;
  final String? grade;
  final String? remarks;

  const AcademicResult({
    this.id,
    required this.studentId,
    required this.subjectId,
    required this.termId,
    required this.academicYearId,
    required this.assessmentScore,
    required this.examScore,
    required this.totalScore,
    this.grade,
    this.remarks,
  });

  @override
  List<Object?> get props => [
        id,
        studentId,
        subjectId,
        termId,
        academicYearId,
        assessmentScore,
        examScore,
        totalScore,
        grade,
        remarks,
      ];

  AcademicResult copyWith({
    int? id,
    int? studentId,
    int? subjectId,
    int? termId,
    int? academicYearId,
    double? assessmentScore,
    double? examScore,
    double? totalScore,
    String? grade,
    String? remarks,
  }) {
    return AcademicResult(
      id: id ?? this.id,
      studentId: studentId ?? this.studentId,
      subjectId: subjectId ?? this.subjectId,
      termId: termId ?? this.termId,
      academicYearId: academicYearId ?? this.academicYearId,
      assessmentScore: assessmentScore ?? this.assessmentScore,
      examScore: examScore ?? this.examScore,
      totalScore: totalScore ?? this.totalScore,
      grade: grade ?? this.grade,
      remarks: remarks ?? this.remarks,
    );
  }
}
