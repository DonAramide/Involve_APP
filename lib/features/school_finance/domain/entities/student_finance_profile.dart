import 'package:equatable/equatable.dart';

class StudentFinanceProfile extends Equatable {
  final String studentId;
  final String walletId;
  final double totalPaid;
  final double outstandingBalance;

  const StudentFinanceProfile({
    required this.studentId,
    required this.walletId,
    required this.totalPaid,
    required this.outstandingBalance,
  });

  @override
  List<Object?> get props => [studentId, walletId, totalPaid, outstandingBalance];
}
