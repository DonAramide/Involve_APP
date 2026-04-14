import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/entities/school_invoice.dart';
import '../../domain/entities/fee_structure.dart';
import '../../domain/repositories/billing_repository.dart';

part 'billing_event.dart';
part 'billing_state.dart';

class BillingBloc extends Bloc<BillingEvent, BillingState> {
  final IBillingRepository repository;

  BillingBloc({required this.repository}) : super(BillingInitial()) {
    on<LoadStudentInvoices>(_onLoadInvoices);
    on<LoadFeeStructures>(_onLoadFees);
    on<CreateStudentInvoice>(_onCreateInvoice);
  }

  Future<void> _onLoadInvoices(LoadStudentInvoices event, Emitter<BillingState> emit) async {
    emit(BillingLoading());
    try {
      final invoices = await repository.getInvoices(event.studentId);
      emit(BillingInvoicesLoaded(invoices));
    } catch (e) {
      emit(BillingError(e.toString()));
    }
  }

  Future<void> _onLoadFees(LoadFeeStructures event, Emitter<BillingState> emit) async {
    try {
      final fees = await repository.getFeeStructures();
      // Handle emitting fee state
    } catch (e) {}
  }

  Future<void> _onCreateInvoice(CreateStudentInvoice event, Emitter<BillingState> emit) async {
    emit(BillingLoading());
    try {
      await repository.createInvoice(event.studentId, event.feeIds);
      add(LoadStudentInvoices(event.studentId));
    } catch (e) {
      emit(BillingError(e.toString()));
    }
  }
}
