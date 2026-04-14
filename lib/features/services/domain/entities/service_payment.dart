import 'package:equatable/equatable.dart';

class ServicePayment extends Equatable {
  final String id;
  final String jobId;
  final double amount;
  final String method;
  final String? reference;
  final DateTime createdAt;

  const ServicePayment({
    required this.id,
    required this.jobId,
    required this.amount,
    required this.method,
    this.reference,
    required this.createdAt,
  });

  @override
  List<Object?> get props => [id, jobId, amount, method, reference, createdAt];
}
