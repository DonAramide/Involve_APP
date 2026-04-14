import 'package:equatable/equatable.dart';

class SchoolFinancialSummary extends Equatable {
  final double totalRevenue;
  final double outstandingFees;
  final int paidStudentsCount;
  final int owingStudentsCount;
  final int totalStudents;
  final DateTime lastUpdated;

  const SchoolFinancialSummary({
    required this.totalRevenue,
    required this.outstandingFees,
    required this.paidStudentsCount,
    required this.owingStudentsCount,
    required this.totalStudents,
    required this.lastUpdated,
  });

  @override
  List<Object?> get props => [
        totalRevenue,
        outstandingFees,
        paidStudentsCount,
        owingStudentsCount,
        totalStudents,
        lastUpdated,
      ];
}
