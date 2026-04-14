import '../../domain/entities/wallet.dart';

class WalletModel extends Wallet {
  const WalletModel({
    required super.id,
    required super.tenantId,
    required super.ownerType,
    required super.ownerId,
    required super.balance,
    required super.currency,
    required super.createdAt,
  });

  factory WalletModel.fromJson(Map<String, dynamic> json) {
    return WalletModel(
      id: json['id'],
      tenantId: json['tenant_id'],
      ownerType: json['owner_type'],
      ownerId: json['owner_id'],
      balance: (json['balance'] as num).toDouble(),
      currency: json['currency'] ?? 'NGN',
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  WalletModel copyWith({
    String? id,
    String? tenantId,
    String? ownerType,
    String? ownerId,
    double? balance,
    String? currency,
    DateTime? createdAt,
  }) {
    return WalletModel(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      ownerType: ownerType ?? this.ownerType,
      ownerId: ownerId ?? this.ownerId,
      balance: balance ?? this.balance,
      currency: currency ?? this.currency,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toJson() {

    return {
      'id': id,
      'tenant_id': tenantId,
      'owner_type': ownerType,
      'owner_id': ownerId,
      'balance': balance,
      'currency': currency,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
