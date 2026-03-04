import 'package:flutter_bloc/flutter_bloc.dart';
import 'staff_state.dart';
import '../../domain/repositories/staff_repository.dart';

class StaffBloc extends Bloc<StaffEvent, StaffState> {
  final StaffRepository repository;

  StaffBloc({required this.repository}) : super(const StaffState()) {
    on<LoadStaffList>(_onLoadStaff);
    on<AddStaff>(_onAddStaff);
    on<UpdateStaff>(_onUpdateStaff);
    on<DeleteStaff>(_onDeleteStaff);
    on<AuthenticateStaff>(_onAuthenticate);
    on<LogoutStaff>(_onLogout);
  }

  Future<void> _onLoadStaff(LoadStaffList event, Emitter<StaffState> emit) async {
    emit(state.copyWith(isLoading: true));
    try {
      final list = await repository.getAllStaff();
      emit(state.copyWith(staffList: list, isLoading: false));
    } catch (e) {
      emit(state.copyWith(error: e.toString(), isLoading: false));
    }
  }

  Future<void> _onAddStaff(AddStaff event, Emitter<StaffState> emit) async {
    try {
      await repository.addStaff(event.staff);
      emit(state.copyWith(successMessage: 'Staff added successfully'));
      add(LoadStaffList());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onUpdateStaff(UpdateStaff event, Emitter<StaffState> emit) async {
    try {
      await repository.updateStaff(event.staff);
      emit(state.copyWith(successMessage: 'Staff updated successfully'));
      add(LoadStaffList());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onDeleteStaff(DeleteStaff event, Emitter<StaffState> emit) async {
    try {
      await repository.deleteStaff(event.id);
      emit(state.copyWith(successMessage: 'Staff removed successfully'));
      add(LoadStaffList());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onAuthenticate(AuthenticateStaff event, Emitter<StaffState> emit) async {
    emit(state.copyWith(isLoading: true));
    try {
      final staff = await repository.authenticateStaff(event.staffId, event.pin);
      if (staff != null) {
        emit(state.copyWith(currentUser: staff, isLoading: false, successMessage: 'Login successful'));
      } else {
        emit(state.copyWith(error: 'Invalid pin', isLoading: false));
      }
    } catch (e) {
      emit(state.copyWith(error: e.toString(), isLoading: false));
    }
  }

  void _onLogout(LogoutStaff event, Emitter<StaffState> emit) {
    emit(state.copyWith(clearCurrentUser: true));
  }
}
