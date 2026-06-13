// lib/features/school_finance/data/models/finance_models.dart

import 'package:equatable/equatable.dart';

// ── Wallet Model ─────────────────────────────────────────────────────────────

class Wallet extends Equatable {
  final String id;
  final String balance; // or double, but usually API returns String for precision
  final double amount;
  final String currency;
  final DateTime updatedAt;

  const Wallet({
    required this.id,
    required this.balance,
    required this.amount,
    required this.currency,
    required this.updatedAt,
  });

  factory Wallet.fromJson(Map<String, dynamic> json) {
    return Wallet(
      id: json['id'] as String,
      balance: json['balance']?.toString() ?? '0.00',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] as String? ?? 'NGN',
      updatedAt: DateTime.parse(json['updated_at'] as String? ?? DateTime.now().toIso8601String()),
    );
  }

  @override
  List<Object?> get props => [id, balance, amount, currency, updatedAt];
}

// ── Transaction Model ────────────────────────────────────────────────────────

enum FinanceTransactionType { credit, debit }

class Transaction extends Equatable {
  final String id;
  final double amount;
  final FinanceTransactionType type;
  final String reference;
  final String description;
  final String status;
  final DateTime createdAt;
  final String channel;

  const Transaction({
    required this.id,
    required this.amount,
    required this.type,
    required this.reference,
    required this.description,
    required this.status,
    required this.createdAt,
    required this.channel,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    final rawType = json['transaction_type'] ?? json['type'];
    return Transaction(
      id: json['id'] as String,
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      type: (rawType == 'credit' || rawType == 'payment')
          ? FinanceTransactionType.credit
          : FinanceTransactionType.debit,
      reference: json['reference'] as String? ?? '',
      description: json['description'] as String? ?? '',
      status: json['status'] as String? ?? 'success',
      createdAt: DateTime.parse(json['created_at'] as String),
      channel: json['channel'] as String? ?? 'unknown',
    );
  }

  @override
  List<Object?> get props => [id, amount, type, reference, description, status, createdAt, channel];
}

// ── Student Finance Summary Model ───────────────────────────────────────────

class StudentFinanceSummary extends Equatable {
  final double totalFees;
  final double totalPaid;
  final double outstandingBalance;
  final double currentBalance;

  const StudentFinanceSummary({
    required this.totalFees,
    required this.totalPaid,
    required this.outstandingBalance,
    required this.currentBalance,
  });

  factory StudentFinanceSummary.fromJson(Map<String, dynamic> json) {
    return StudentFinanceSummary(
      totalFees: (json['totalFees'] as num?)?.toDouble() ?? 0.0,
      totalPaid: (json['totalPaid'] as num?)?.toDouble() ?? 0.0,
      outstandingBalance: (json['outstandingBalance'] as num?)?.toDouble() ?? 0.0,
      currentBalance: (json['currentBalance'] as num?)?.toDouble() ?? 0.0,
    );
  }

  @override
  List<Object?> get props => [totalFees, totalPaid, outstandingBalance, currentBalance];
}

// ── Transaction Audit Model ───────────────────────────────────────────

class TransactionAuditModel extends Equatable {
  final String id;
  final String type; // INVOICE, POS
  final String paymentMethod;
  final double amount;
  final String status;
  final String staffName;
  final DateTime date;
  final List<dynamic> items;
  final String customerName;
  final String reference;

  const TransactionAuditModel({
    required this.id,
    required this.type,
    required this.paymentMethod,
    required this.amount,
    required this.status,
    required this.staffName,
    required this.date,
    required this.items,
    required this.customerName,
    required this.reference,
  });

  factory TransactionAuditModel.fromJson(Map<String, dynamic> json) {
    return TransactionAuditModel(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? '',
      paymentMethod: json['paymentMethod'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] as String? ?? 'Pending',
      staffName: json['staffName'] as String? ?? 'System',
      date: DateTime.tryParse(json['date'] as String? ?? '') ?? DateTime.now(),
      items: json['items'] as List<dynamic>? ?? [],
      customerName: json['customerName'] as String? ?? '',
      reference: json['reference'] as String? ?? '',
    );
  }

  @override
  List<Object?> get props => [id, type, paymentMethod, amount, status, staffName, date, items, customerName, reference];
}
