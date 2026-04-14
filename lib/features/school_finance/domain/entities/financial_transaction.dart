import 'package:equatable/equatable.dart';

enum TransactionType { credit, debit }

class FinancialTransaction extends Equatable {
  final String id;
  final String walletId;
  final double amount;
  final TransactionType type;
  final String reference;
  final String description;
  final double balanceAfter;
  final String channel;
  final String? recordedBy;
  final String? note;
  final DateTime createdAt;
  final Map<String, dynamic> metadata;

  const FinancialTransaction({
    required this.id,
    required this.walletId,
    required this.amount,
    required this.type,
    required this.reference,
    required this.description,
    required this.balanceAfter,
    required this.channel,
    required this.createdAt,
    this.recordedBy,
    this.note,
    this.metadata = const {},
  });

  @override
  List<Object?> get props => [
        id,
        walletId,
        amount,
        type,
        reference,
        description,
        balanceAfter,
        channel,
        createdAt,
        recordedBy,
        note,
        metadata
      ];
}
