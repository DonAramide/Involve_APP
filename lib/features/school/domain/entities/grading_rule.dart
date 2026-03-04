import 'package:equatable/equatable.dart';

class GradingRule extends Equatable {
  final int? id;
  final String grade;
  final double minScore;
  final double maxScore;
  final String? remarks;

  const GradingRule({
    this.id,
    required this.grade,
    required this.minScore,
    required this.maxScore,
    this.remarks,
  });

  GradingRule copyWith({
    int? id,
    String? grade,
    double? minScore,
    double? maxScore,
    String? remarks,
  }) {
    return GradingRule(
      id: id ?? this.id,
      grade: grade ?? this.grade,
      minScore: minScore ?? this.minScore,
      maxScore: maxScore ?? this.maxScore,
      remarks: remarks ?? this.remarks,
    );
  }

  @override
  List<Object?> get props => [id, grade, minScore, maxScore, remarks];
}
