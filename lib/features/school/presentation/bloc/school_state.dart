import 'package:equatable/equatable.dart';
import 'package:involve_app/features/school/domain/entities/academic_year.dart';
import 'package:involve_app/features/school/domain/entities/term.dart';
import 'package:involve_app/features/school/domain/entities/school_class.dart';
import 'package:involve_app/features/school/domain/entities/student.dart';
import 'package:involve_app/features/stock/domain/entities/item.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';

abstract class SchoolEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class LoadSchoolData extends SchoolEvent {}

class AddAcademicYearEvent extends SchoolEvent {
  final String name;
  AddAcademicYearEvent(this.name);
  @override
  List<Object?> get props => [name];
}

class SetActiveYearEvent extends SchoolEvent {
  final int id;
  SetActiveYearEvent(this.id);
  @override
  List<Object?> get props => [id];
}

class AddTermEvent extends SchoolEvent {
  final int academicYearId;
  final String name;
  AddTermEvent({required this.academicYearId, required this.name});
  @override
  List<Object?> get props => [academicYearId, name];
}

class SetActiveTermEvent extends SchoolEvent {
  final int id;
  SetActiveTermEvent(this.id);
  @override
  List<Object?> get props => [id];
}

class AddClassEvent extends SchoolEvent {
  final String name;
  final String? description;
  AddClassEvent(this.name, {this.description});
  @override
  List<Object?> get props => [name, description];
}

class DeleteClassEvent extends SchoolEvent {
  final int id;
  DeleteClassEvent(this.id);
  @override
  List<Object?> get props => [id];
}

class AddStudentEvent extends SchoolEvent {
  final Student student;
  AddStudentEvent(this.student);
  @override
  List<Object?> get props => [student];
}

class UpdateStudentEvent extends SchoolEvent {
  final Student student;
  UpdateStudentEvent(this.student);
  @override
  List<Object?> get props => [student];
}

class DeleteStudentEvent extends SchoolEvent {
  final int id;
  DeleteStudentEvent(this.id);
  @override
  List<Object?> get props => [id];
}

class PromoteStudentsEvent extends SchoolEvent {
  final List<int> studentIds;
  final int targetClassId;
  PromoteStudentsEvent({required this.studentIds, required this.targetClassId});
  @override
  List<Object?> get props => [studentIds, targetClassId];
}

class LoadStudentRecordsEvent extends SchoolEvent {
  final int studentId;
  LoadStudentRecordsEvent(this.studentId);
  @override
  List<Object?> get props => [studentId];
}

class ResetSchoolStatus extends SchoolEvent {}

enum SchoolStatus { initial, loading, success, failure }

class SchoolState extends Equatable {
  final List<AcademicYear> academicYears;
  final List<Term> terms;
  final List<SchoolClass> classes;
  final List<Student> students;
  final List<Item> items;
  final List<Invoice> studentInvoices;
  final bool isLoading;
  final String? error;
  final SchoolStatus status;

  const SchoolState({
    this.academicYears = const [],
    this.terms = const [],
    this.classes = const [],
    this.students = const [],
    this.items = const [],
    this.studentInvoices = const [],
    this.isLoading = false,
    this.error,
    this.status = SchoolStatus.initial,
  });

  AcademicYear? get activeYear => academicYears.where((y) => y.isActive).firstOrNull ?? academicYears.firstOrNull;
  Term? get activeTerm => terms.where((t) => t.isActive).firstOrNull ?? terms.firstOrNull;

  SchoolState copyWith({
    List<AcademicYear>? academicYears,
    List<Term>? terms,
    List<SchoolClass>? classes,
    List<Student>? students,
    List<Item>? items,
    List<Invoice>? studentInvoices,
    bool? isLoading,
    String? error,
    SchoolStatus? status,
  }) {
    return SchoolState(
      academicYears: academicYears ?? this.academicYears,
      terms: terms ?? this.terms,
      classes: classes ?? this.classes,
      students: students ?? this.students,
      items: items ?? this.items,
      studentInvoices: studentInvoices ?? this.studentInvoices,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      status: status ?? this.status,
    );
  }

  @override
  List<Object?> get props => [academicYears, terms, classes, students, items, studentInvoices, isLoading, error, status];
}
