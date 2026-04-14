import 'package:equatable/equatable.dart';

class VirtualAccount extends Equatable {
  final String id;
  final String studentId;
  final String accountNumber;
  final String bankName;
  final String provider;
  final String reference;

  const VirtualAccount({
    required this.id,
    required this.studentId,
    required this.accountNumber,
    required this.bankName,
    required this.provider,
    required this.reference,
  });

  factory VirtualAccount.fromJson(Map<String, dynamic> json) {
    return VirtualAccount(
      id: json['id'],
      studentId: json['student_id'],
      accountNumber: json['account_number'],
      bankName: json['bank_name'],
      provider: json['provider'],
      reference: json['reference'],
    );
  }

  @override
  List<Object?> get props => [id, studentId, accountNumber, bankName, provider, reference];
}
