import 'package:equatable/equatable.dart';

class Staff extends Equatable {
  final int? id;
  final String name;
  final String staffCode;
  final String? phone;
  final bool isActive;
  final String? syncId;

  const Staff({
    this.id,
    required this.name,
    required this.staffCode,
    this.phone,
    this.isActive = true,
    this.syncId,
  });

  Staff copyWith({
    int? id,
    String? name,
    String? staffCode,
    String? phone,
    bool? isActive,
    String? syncId,
  }) {
    return Staff(
      id: id ?? this.id,
      name: name ?? this.name,
      staffCode: staffCode ?? this.staffCode,
      phone: phone ?? this.phone,
      isActive: isActive ?? this.isActive,
      syncId: syncId ?? this.syncId,
    );
  }

  @override
  List<Object?> get props => [id, name, staffCode, phone, isActive, syncId];
}
