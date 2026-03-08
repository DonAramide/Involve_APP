import 'package:equatable/equatable.dart';

class Staff extends Equatable {
  final int? id;
  final String name;
  final String staffCode;
  final String? staffId;
  final String? phone;
  final bool isActive;
  final String? syncId;

  const Staff({
    this.id,
    required this.name,
    required this.staffCode,
    this.staffId,
    this.phone,
    this.isActive = true,
    this.syncId,
  });

  Staff copyWith({
    int? id,
    String? name,
    String? staffCode,
    String? staffId,
    String? phone,
    bool? isActive,
    String? syncId,
  }) {
    return Staff(
      id: id ?? this.id,
      name: name ?? this.name,
      staffCode: staffCode ?? this.staffCode,
      staffId: staffId ?? this.staffId,
      phone: phone ?? this.phone,
      isActive: isActive ?? this.isActive,
      syncId: syncId ?? this.syncId,
    );
  }

  @override
  List<Object?> get props => [id, name, staffCode, staffId, phone, isActive, syncId];
}
