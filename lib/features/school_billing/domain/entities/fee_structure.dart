import 'package:equatable/equatable.dart';

class FeeStructure extends Equatable {
  final String id;
  final String name;
  final String description;
  final double amount;
  final bool isCompulsory;
  final String category; // 'Tuition', 'Transport', 'Uniform', etc.

  const FeeStructure({
    required this.id,
    required this.name,
    required this.description,
    required this.amount,
    this.isCompulsory = true,
    required this.category,
  });

  @override
  List<Object?> get props => [id, name, description, amount, isCompulsory, category];
}
