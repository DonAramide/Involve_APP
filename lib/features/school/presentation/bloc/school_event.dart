part of 'school_bloc.dart';

abstract class SchoolEvent extends Equatable {
  const SchoolEvent();

  @override
  List<Object?> get props => [];
}

class LoadSchoolData extends SchoolEvent {}

class AddAcademicYearEvent extends SchoolEvent {
  final String name;
  final DateTime startDate;
  final DateTime endDate;
  const AddAcademicYearEvent({required this.name, required this.startDate, required this.endDate});
  @override
  List<Object?> get props => [name, startDate, endDate];
}

class SetActiveYearEvent extends SchoolEvent {
  final int id;
  const SetActiveYearEvent(this.id);
  @override
  List<Object?> get props => [id];
}

class UpdateAcademicYearEvent extends SchoolEvent {
  final AcademicYear year;
  const UpdateAcademicYearEvent(this.year);
  @override
  List<Object?> get props => [year];
}

class AddTermEvent extends SchoolEvent {
  final int academicYearId;
  final String name;
  final DateTime startDate;
  final DateTime endDate;
  const AddTermEvent({required this.academicYearId, required this.name, required this.startDate, required this.endDate});
  @override
  List<Object?> get props => [academicYearId, name, startDate, endDate];
}

class SetActiveTermEvent extends SchoolEvent {
  final int id;
  const SetActiveTermEvent(this.id);
  @override
  List<Object?> get props => [id];
}

class UpdateTermEvent extends SchoolEvent {
  final Term term;
  const UpdateTermEvent(this.term);
  @override
  List<Object?> get props => [term];
}

class AddClassEvent extends SchoolEvent {
  final String name;
  final String? description;
  const AddClassEvent(this.name, {this.description});
  @override
  List<Object?> get props => [name, description];
}

class DeleteClassEvent extends SchoolEvent {
  final int id;
  const DeleteClassEvent(this.id);
  @override
  List<Object?> get props => [id];
}

class AddStudentEvent extends SchoolEvent {
  final Student student;
  const AddStudentEvent(this.student);
  @override
  List<Object?> get props => [student];
}

class UpdateStudentEvent extends SchoolEvent {
  final Student student;
  const UpdateStudentEvent(this.student);
  @override
  List<Object?> get props => [student];
}

class DeleteStudentEvent extends SchoolEvent {
  final int id;
  const DeleteStudentEvent(this.id);
  @override
  List<Object?> get props => [id];
}

class PromoteStudentsEvent extends SchoolEvent {
  final List<int> studentIds;
  final int targetClassId;
  const PromoteStudentsEvent({required this.studentIds, required this.targetClassId});
  @override
  List<Object?> get props => [studentIds, targetClassId];
}

class LoadStudentRecordsEvent extends SchoolEvent {
  final int studentId;
  const LoadStudentRecordsEvent(this.studentId);
  @override
  List<Object?> get props => [studentId];
}

class LoadSubjectsEvent extends SchoolEvent {}

class AddSubjectEvent extends SchoolEvent {
  final String name;
  final String? code;
  final int? teacherId;
  const AddSubjectEvent({required this.name, this.code, this.teacherId});
  @override
  List<Object?> get props => [name, code, teacherId];
}

class UpdateSubjectEvent extends SchoolEvent {
  final Subject subject;
  const UpdateSubjectEvent(this.subject);
  @override
  List<Object?> get props => [subject];
}

class DeleteSubjectEvent extends SchoolEvent {
  final int id;
  const DeleteSubjectEvent(this.id);
  @override
  List<Object?> get props => [id];
}

class LoadResultsEvent extends SchoolEvent {
  final int? studentId;
  final int? classId;
  final int? subjectId;
  final int? termId;
  final int? academicYearId;

  const LoadResultsEvent({
    this.studentId,
    this.classId,
    this.subjectId,
    this.termId,
    this.academicYearId,
  });

  @override
  List<Object?> get props => [studentId, classId, subjectId, termId, academicYearId];
}

class ResetSchoolStatus extends SchoolEvent {}

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

class AddTeacherEvent extends SchoolEvent {
  final Teacher teacher;
  const AddTeacherEvent(this.teacher);
  @override
  List<Object?> get props => [teacher];
}

class UpdateTeacherEvent extends SchoolEvent {
  final Teacher teacher;
  const UpdateTeacherEvent(this.teacher);
  @override
  List<Object?> get props => [teacher];
}

class DeleteTeacherEvent extends SchoolEvent {
  final int id;
  const DeleteTeacherEvent(this.id);
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
  final List<AcademicResult> results;
  const SaveResultsEvent(this.results);
  @override
  List<Object?> get props => [results];
}

class MakeStudentPaymentEvent extends SchoolEvent {
  final int studentId;
  final double amount;
  final String method;
  final String? remarks;
  const MakeStudentPaymentEvent({
    required this.studentId,
    required this.amount,
    required this.method,
    this.remarks,
  });
  @override
  List<Object?> get props => [studentId, amount, method, remarks];
}
