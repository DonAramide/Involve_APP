import 'package:equatable/equatable.dart';

class StudentFinancialSummary extends Equatable {
  final double totalFees;
  final double totalPaid;
  final double outstandingBalance;
  final double currentBalance;

  const StudentFinancialSummary({
    required this.totalFees,
    required this.totalPaid,
    required this.outstandingBalance,
    required this.currentBalance,
  });

  factory StudentFinancialSummary.fromJson(Map<String, dynamic> json) {
    return StudentFinancialSummary(
      totalFees: (json['totalFees'] as num).toDouble(),
      totalPaid: (json['totalPaid'] as num).toDouble(),
      outstandingBalance: (json['outstandingBalance'] as num).toDouble(),
      currentBalance: (json['currentBalance'] as num).toDouble(),
    );
  }

  @override
  List<Object?> get props => [totalFees, totalPaid, outstandingBalance, currentBalance];
}
