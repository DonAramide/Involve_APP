import 'package:equatable/equatable.dart';

class AcademicYear extends Equatable {
  final int? id;
  final String name;
  final bool isActive;

  const AcademicYear({
    this.id,
    required this.name,
    this.isActive = false,
  });

  AcademicYear copyWith({
    int? id,
    String? name,
    bool? isActive,
  }) {
    return AcademicYear(
      id: id ?? this.id,
      name: name ?? this.name,
      isActive: isActive ?? this.isActive,
    );
  }

  @override
  List<Object?> get props => [id, name, isActive];
}
