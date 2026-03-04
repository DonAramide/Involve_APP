import 'package:equatable/equatable.dart';

class SchoolClass extends Equatable {
  final int? id;
  final String name;
  final String? description;

  const SchoolClass({
    this.id,
    required this.name,
    this.description,
  });

  SchoolClass copyWith({
    int? id,
    String? name,
    String? description,
  }) {
    return SchoolClass(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
    );
  }

  @override
  List<Object?> get props => [id, name, description];
}
