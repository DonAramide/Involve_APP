part of 'billing_bloc.dart';

abstract class BillingState extends Equatable {
  const BillingState();

  @override
  List<Object?> get props => [];
}

class BillingInitial extends BillingState {}

class BillingLoading extends BillingState {}

class BillingInvoicesLoaded extends BillingState {
  final List<SchoolInvoice> invoices;
  const BillingInvoicesLoaded(this.invoices);

  @override
  List<Object?> get props => [invoices];
}

class BillingError extends BillingState {
  final String message;
  const BillingError(this.message);

  @override
  List<Object?> get props => [message];
}
