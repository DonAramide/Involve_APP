import 'package:equatable/equatable.dart';
import '../../domain/entities/staff.dart';

abstract class StaffEvent extends Equatable {
  const StaffEvent();
  @override
  List<Object?> get props => [];
}

class LoadStaffList extends StaffEvent {}

class AddStaff extends StaffEvent {
  final Staff staff;
  const AddStaff(this.staff);
  @override
  List<Object?> get props => [staff];
}

class UpdateStaff extends StaffEvent {
  final Staff staff;
  const UpdateStaff(this.staff);
  @override
  List<Object?> get props => [staff];
}

class DeleteStaff extends StaffEvent {
  final int id;
  const DeleteStaff(this.id);
  @override
  List<Object?> get props => [id];
}

class StaffState extends Equatable {
  final List<Staff> staffList;
  final bool isLoading;
  final String? error;
  final String? successMessage;

  const StaffState({
    this.staffList = const [],
    this.isLoading = false,
    this.error,
    this.successMessage,
  });

  StaffState copyWith({
    List<Staff>? staffList,
    bool? isLoading,
    String? error,
    String? successMessage,
  }) {
    return StaffState(
      staffList: staffList ?? this.staffList,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      successMessage: successMessage,
    );
  }

  @override
  List<Object?> get props => [staffList, isLoading, error, successMessage];
}
