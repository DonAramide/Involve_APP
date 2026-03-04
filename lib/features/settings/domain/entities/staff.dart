import 'package:equatable/equatable.dart';

class Staff extends Equatable {
  final int? id;
  final String name;
  final String staffCode;
  final bool isActive;
  final String role;
  final String? syncId;

  const Staff({
    this.id,
    required this.name,
    required this.staffCode,
    this.role = 'Admin',
    this.isActive = true,
    this.syncId,
  });

  Staff copyWith({
    int? id,
    String? name,
    String? staffCode,
    String? role,
    bool? isActive,
    String? syncId,
  }) {
    return Staff(
      id: id ?? this.id,
      name: name ?? this.name,
      staffCode: staffCode ?? this.staffCode,
      role: role ?? this.role,
      isActive: isActive ?? this.isActive,
      syncId: syncId ?? this.syncId,
    );
  }

  @override
  List<Object?> get props => [id, name, staffCode, role, isActive, syncId];
}
