part of 'billing_bloc.dart';

abstract class BillingEvent extends Equatable {
  const BillingEvent();

  @override
  List<Object?> get props => [];
}

class LoadStudentInvoices extends BillingEvent {
  final String studentId;
  const LoadStudentInvoices(this.studentId);

  @override
  List<Object?> get props => [studentId];
}

class LoadFeeStructures extends BillingEvent {}

class CreateStudentInvoice extends BillingEvent {
  final String studentId;
  final List<String> feeIds;

  const CreateStudentInvoice(this.studentId, this.feeIds);

  @override
  List<Object?> get props => [studentId, feeIds];
}
