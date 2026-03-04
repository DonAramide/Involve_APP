import 'package:equatable/equatable.dart';

class Term extends Equatable {
  final int? id;
  final int academicYearId;
  final String name;
  final bool isActive;

  const Term({
    this.id,
    required this.academicYearId,
    required this.name,
    this.isActive = false,
  });

  Term copyWith({
    int? id,
    int? academicYearId,
    String? name,
    bool? isActive,
  }) {
    return Term(
      id: id ?? this.id,
      academicYearId: academicYearId ?? this.academicYearId,
      name: name ?? this.name,
      isActive: isActive ?? this.isActive,
    );
  }

  @override
  List<Object?> get props => [id, academicYearId, name, isActive];
}
