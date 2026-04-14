import 'package:equatable/equatable.dart';

class Wallet extends Equatable {
  final String id;
  final String tenantId;
  final String ownerType; // e.g., 'student'
  final String ownerId;   // studentId
  final double balance;
  final String currency;
  final DateTime createdAt;

  const Wallet({
    required this.id,
    required this.tenantId,
    required this.ownerType,
    required this.ownerId,
    required this.balance,
    this.currency = 'NGN',
    required this.createdAt,
  });

  @override
  List<Object?> get props => [id, tenantId, ownerType, ownerId, balance, currency, createdAt];
}
