import 'package:equatable/equatable.dart';

class Category extends Equatable {
  final int? id;
  final String name;
  final String? syncId;

  const Category({this.id, required this.name, this.syncId});

  Category copyWith({
    int? id,
    String? name,
    String? syncId,
  }) {
    return Category(
      id: id ?? this.id,
      name: name ?? this.name,
      syncId: syncId ?? this.syncId,
    );
  }

  @override
  List<Object?> get props => [id, name, syncId];
}
