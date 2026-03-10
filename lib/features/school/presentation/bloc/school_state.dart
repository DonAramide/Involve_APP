import 'package:equatable/equatable.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/school/domain/entities/grading_rule.dart';
import 'package:involve_app/features/stock/domain/entities/item.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';

enum SchoolStatus { initial, loading, success, failure }

class SchoolState extends Equatable {
  final List<AcademicYear> academicYears;
  final List<Term> terms;
  final List<SchoolClass> classes;
  final List<Student> students;
  final List<Item> items;
  final List<Invoice> studentInvoices;
  final List<Subject> subjects;
  final List<AcademicResult> results;
  final List<GradingRule> gradingRules;
  final List<Teacher> teachers;
  final double? studentAverage;
  final double? classAverage;
  final int? studentPosition;
  final int? classSize;
  final String? nextAdmissionNumber;
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
    this.subjects = const [],
    this.results = const [],
    this.gradingRules = const [],
    this.teachers = const [],
    this.studentAverage,
    this.classAverage,
    this.studentPosition,
    this.classSize,
    this.nextAdmissionNumber,
    this.isLoading = false,
    this.error,
    this.status = SchoolStatus.initial,
  });

  AcademicYear? get activeYear => academicYears.where((y) => y.isCurrent).firstOrNull ?? academicYears.firstOrNull;
  Term? get activeTerm => terms.where((t) => t.isCurrent).firstOrNull ?? terms.firstOrNull;

  SchoolState copyWith({
    List<AcademicYear>? academicYears,
    List<Term>? terms,
    List<SchoolClass>? classes,
    List<Student>? students,
    List<Item>? items,
    List<Invoice>? studentInvoices,
    List<Subject>? subjects,
    List<AcademicResult>? results,
    List<GradingRule>? gradingRules,
    List<Teacher>? teachers,
    double? studentAverage,
    double? classAverage,
    int? studentPosition,
    int? classSize,
    String? nextAdmissionNumber,
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
      subjects: subjects ?? this.subjects,
      results: results ?? this.results,
      gradingRules: gradingRules ?? this.gradingRules,
      teachers: teachers ?? this.teachers,
      studentAverage: studentAverage ?? this.studentAverage,
      classAverage: classAverage ?? this.classAverage,
      studentPosition: studentPosition ?? this.studentPosition,
      classSize: classSize ?? this.classSize,
      nextAdmissionNumber: nextAdmissionNumber ?? this.nextAdmissionNumber,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      status: status ?? this.status,
    );
  }

  @override
  List<Object?> get props => [
        academicYears,
        terms,
        classes,
        students,
        items,
        studentInvoices,
        subjects,
        results,
        gradingRules,
        teachers,
        studentAverage,
        classAverage,
        studentPosition,
        classSize,
        nextAdmissionNumber,
        isLoading,
        error,
        status
      ];
}
