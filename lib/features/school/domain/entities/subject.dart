import 'package:equatable/equatable.dart';

class Subject extends Equatable {
  final int? id;
  final String name;
  final String? code;

  const Subject({
    this.id,
    required this.name,
    this.code,
  });

  @override
  List<Object?> get props => [id, name, code];

  Subject copyWith({
    int? id,
    String? name,
    String? code,
  }) {
    return Subject(
      id: id ?? this.id,
      name: name ?? this.name,
      code: code ?? this.code,
    );
  }
}
