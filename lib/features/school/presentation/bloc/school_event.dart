part of 'school_bloc.dart';

abstract class SchoolEvent extends Equatable {
  const SchoolEvent();

  @override
  List<Object?> get props => [];
}

class LoadSchoolData extends SchoolEvent {}

class LoadGradingRules extends SchoolEvent {}

class AddGradingRuleEvent extends SchoolEvent {
  final GradingRule rule;
  const AddGradingRuleEvent(this.rule);
  @override
  List<Object?> get props => [rule];
}

class UpdateGradingRuleEvent extends SchoolEvent {
  final GradingRule rule;
  const UpdateGradingRuleEvent(this.rule);
  @override
  List<Object?> get props => [rule];
}

class DeleteGradingRuleEvent extends SchoolEvent {
  final int id;
  const DeleteGradingRuleEvent(this.id);
  @override
  List<Object?> get props => [id];
}

class LoadStudentsEvent extends SchoolEvent {
  final int classId;
  const LoadStudentsEvent(this.classId);
  @override
  List<Object?> get props => [classId];
}

class SaveResultsEvent extends SchoolEvent {
  final List<Result> results;
  const SaveResultsEvent(this.results);
  @override
  List<Object?> get props => [results];
}
