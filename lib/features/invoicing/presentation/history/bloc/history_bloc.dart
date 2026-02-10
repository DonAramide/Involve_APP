import 'package:flutter_bloc/flutter_bloc.dart';
import 'history_state.dart';
import '../../../domain/usecases/history_usecases.dart';

class HistoryBloc extends Bloc<HistoryEvent, HistoryState> {
  final GetInvoiceHistory getHistory;

  HistoryBloc({required this.getHistory}) : super(HistoryInitial()) {
    on<LoadHistory>(_onLoadHistory);
  }

  Future<void> _onLoadHistory(LoadHistory event, Emitter<HistoryState> emit) async {
    emit(HistoryLoading());
    try {
      final invoices = await getHistory(start: event.start, end: event.end);
      emit(HistoryLoaded(invoices));
    } catch (e) {
      emit(HistoryError('Failed to load history: ${e.toString()}'));
    }
  }
}
