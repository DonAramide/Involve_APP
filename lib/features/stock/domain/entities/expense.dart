import 'package:equatable/equatable.dart';

class Expense extends Equatable {
  final int? id;
  final double amount;
  final String description;
  final String? category;
  final DateTime date;
  final String? syncId;

  const Expense({
    this.id,
    required this.amount,
    required this.description,
    this.category,
    required this.date,
    this.syncId,
  });

  @override
  List<Object?> get props => [id, amount, description, category, date, syncId];

  Expense copyWith({
    int? id,
    double? amount,
    String? description,
    String? category,
    DateTime? date,
    String? syncId,
  }) {
    return Expense(
      id: id ?? this.id,
      amount: amount ?? this.amount,
      description: description ?? this.description,
      category: category ?? this.category,
      date: date ?? this.date,
      syncId: syncId ?? this.syncId,
    );
  }
}
