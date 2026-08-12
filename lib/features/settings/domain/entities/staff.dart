import 'package:equatable/equatable.dart';

class Staff extends Equatable {
  final int? id;
  final String name;
  final String staffCode;
  final String? staffId;
  final String? phone;
  final String role; // 'STAFF' | 'ADMIN' | 'FINANCE'
  final bool isActive;
  final String? syncId;
  /// Personal bank for salary (UI label); stored historically as virtual*
  final String? virtualBankName;
  final String? virtualAccountNumber;
  final String? virtualAccountName;
  final String? bankCode;

  const Staff({
    this.id,
    required this.name,
    required this.staffCode,
    this.staffId,
    this.phone,
    this.role = 'STAFF',
    this.isActive = true,
    this.syncId,
    this.virtualBankName,
    this.virtualAccountNumber,
    this.virtualAccountName,
    this.bankCode,
  });

  Staff copyWith({
    int? id,
    String? name,
    String? staffCode,
    String? staffId,
    String? phone,
    String? role,
    bool? isActive,
    String? syncId,
    String? virtualBankName,
    String? virtualAccountNumber,
    String? virtualAccountName,
    String? bankCode,
  }) {
    return Staff(
      id: id ?? this.id,
      name: name ?? this.name,
      staffCode: staffCode ?? this.staffCode,
      staffId: staffId ?? this.staffId,
      phone: phone ?? this.phone,
      role: role ?? this.role,
      isActive: isActive ?? this.isActive,
      syncId: syncId ?? this.syncId,
      virtualBankName: virtualBankName ?? this.virtualBankName,
      virtualAccountNumber: virtualAccountNumber ?? this.virtualAccountNumber,
      virtualAccountName: virtualAccountName ?? this.virtualAccountName,
      bankCode: bankCode ?? this.bankCode,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        staffCode,
        staffId,
        phone,
        role,
        isActive,
        syncId,
        virtualBankName,
        virtualAccountNumber,
        virtualAccountName,
        bankCode,
      ];
}
