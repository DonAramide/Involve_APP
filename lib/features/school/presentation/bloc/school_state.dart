part of 'school_bloc.dart';

class SchoolState extends Equatable {
  final List<GradingRule> gradingRules;
  final List<AcademicYear> academicYears;
  final List<Term> terms;
  final List<ClassEntity> classes;
  final List<Subject> subjects;
  final List<Student> students; // Added students
  final bool isLoading;
  final bool isSaving; // Added isSaving
  final String? error;

  const SchoolState({
    this.gradingRules = const [],
    this.academicYears = const [],
    this.terms = const [],
    this.classes = const [],
    this.subjects = const [],
    this.students = const [], // Initialize students
    this.isLoading = false,
    this.isSaving = false, // Initialize isSaving
    this.error,
  });

  SchoolState copyWith({
    List<GradingRule>? gradingRules,
    List<AcademicYear>? academicYears,
    List<Term>? terms,
    List<ClassEntity>? classes,
    List<Subject>? subjects,
    List<Student>? students, // Added students
    bool? isLoading,
    bool? isSaving, // Update isSaving
    String? error,
  }) {
    return SchoolState(
      gradingRules: gradingRules ?? this.gradingRules,
      academicYears: academicYears ?? this.academicYears,
      terms: terms ?? this.terms,
      classes: classes ?? this.classes,
      subjects: subjects ?? this.subjects,
      students: students ?? this.students, // Map students
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving, // Map isSaving
      error: error,
    );
  }

  @override
  List<Object?> get props => [
    gradingRules,
    academicYears,
    terms,
    classes,
    subjects,
    students, // Added students
    isLoading,
    error,
  ];
}
