import '../../domain/entities/financial_transaction.dart';

class TransactionModel extends FinancialTransaction {
  const TransactionModel({
    required super.id,
    required super.walletId,
    required super.amount,
    required super.type,
    required super.reference,
    required super.description,
    required super.balanceAfter,
    required super.channel,
    required super.createdAt,
    super.recordedBy,
    super.note,
    super.metadata = const {},
  });

  factory TransactionModel.fromJson(Map<String, dynamic> json) {
    final rawType = json['transaction_type'] ?? json['type'];
    
    // Extract metadata and inject joined student data
    final Map<String, dynamic> metadata = Map<String, dynamic>.from(json['metadata'] ?? {});
    if (json['students'] != null) {
      metadata['student_id'] = json['student_id'];
      metadata['student_name'] = '${json['students']['first_name']} ${json['students']['last_name']}';
    }

    return TransactionModel(
      id: json['id'],
      walletId: json['wallet_id'],
      amount: (json['amount'] as num).toDouble(),
      type: rawType == 'payment' || rawType == 'credit' 
          ? TransactionType.credit 
          : TransactionType.debit,
      reference: json['reference'] ?? '',
      description: json['description'] ?? '',
      balanceAfter: (json['balance_after'] as num).toDouble(),
      channel: json['channel'] ?? 'unknown',
      recordedBy: json['recorded_by'],
      note: json['note'],
      metadata: metadata,
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'wallet_id': walletId,
      'amount': amount,
      'transaction_type': type == TransactionType.credit ? 'payment' : 'charge',
      'reference': reference,
      'description': description,
      'balance_after': balanceAfter,
      'channel': channel,
      'recorded_by': recordedBy,
      'note': note,
      'metadata': metadata,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

