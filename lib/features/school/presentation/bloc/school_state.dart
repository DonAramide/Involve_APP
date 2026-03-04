import 'package:equatable/equatable.dart';
import '../../domain/entities/school_entities.dart';
import '../../domain/entities/grading_rule.dart';
import '../../../stock/domain/entities/item.dart';
import '../../../invoicing/domain/entities/invoice.dart';

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
      isLoading: isLoading ?? this.isLoading,
      error: error,
      status: status ?? this.status,
    );
  }

  @override
  List<Object?> get props => [academicYears, terms, classes, students, items, studentInvoices, subjects, results, gradingRules, isLoading, error, status];
}
