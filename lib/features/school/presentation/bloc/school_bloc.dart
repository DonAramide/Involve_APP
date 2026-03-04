import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/school/domain/repositories/school_repository.dart';
import 'package:involve_app/features/school/domain/entities/academic_year.dart';
import 'package:involve_app/features/school/domain/entities/term.dart';
import 'package:involve_app/features/school/domain/entities/school_class.dart';
import 'package:involve_app/features/school/domain/entities/student.dart';
import 'package:involve_app/features/school/domain/entities/subject.dart';
import 'package:involve_app/features/school/domain/entities/academic_result.dart';
import 'package:involve_app/features/stock/domain/repositories/item_repository.dart';
import 'package:involve_app/features/stock/domain/entities/item.dart';
import 'package:involve_app/features/school/presentation/bloc/school_state.dart';
import 'package:involve_app/features/invoicing/domain/repositories/invoice_repository.dart';

class SchoolBloc extends Bloc<SchoolEvent, SchoolState> {
  final SchoolRepository repository;
  final ItemRepository itemRepository;
  final InvoiceRepository invoiceRepository;

  SchoolBloc({
    required this.repository, 
    required this.itemRepository,
    required this.invoiceRepository,
  }) : super(const SchoolState()) {
    on<LoadSchoolData>(_onLoadSchoolData);
    on<AddAcademicYearEvent>(_onAddAcademicYear);
    on<SetActiveYearEvent>(_onSetActiveYear);
    on<AddTermEvent>(_onAddTerm);
    on<SetActiveTermEvent>(_onSetActiveTerm);
    on<AddClassEvent>(_onAddClass);
    on<DeleteClassEvent>(_onDeleteClass);
    on<AddStudentEvent>(_onAddStudent);
    on<UpdateStudentEvent>(_onUpdateStudent);
    on<DeleteStudentEvent>(_onDeleteStudent);
    on<PromoteStudentsEvent>(_onPromoteStudents);
    on<LoadStudentRecordsEvent>(_onLoadStudentRecords);
    on<LoadSubjectsEvent>(_onLoadSubjects);
    on<AddSubjectEvent>(_onAddSubject);
    on<UpdateSubjectEvent>(_onUpdateSubject);
    on<DeleteSubjectEvent>(_onDeleteSubject);
    on<LoadResultsEvent>(_onLoadResults);
    on<SaveResultsEvent>(_onSaveResults);
    on<ResetSchoolStatus>((event, emit) => emit(state.copyWith(status: SchoolStatus.initial, error: null)));
    
    add(LoadSchoolData());
  }

  Future<void> _onLoadSchoolData(LoadSchoolData event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading, error: null));
    try {
      final years = await repository.getAcademicYears();
      final classes = await repository.getClasses();
      final students = await repository.getStudents();
      final items = await itemRepository.getAllItems();
      
      final activeYear = years.where((y) => y.isActive).firstOrNull ?? years.firstOrNull;
      List<Term> terms = [];
      if (activeYear != null) {
        terms = await repository.getTerms(activeYear.id!);
      }

      emit(state.copyWith(
        academicYears: years,
        classes: classes,
        terms: terms,
        students: students,
        items: items,
        isLoading: false,
        status: SchoolStatus.initial,
      ));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> _onAddAcademicYear(AddAcademicYearEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading, error: null));
    try {
      final newYear = AcademicYear(name: event.name, isActive: state.academicYears.isEmpty);
      await repository.addAcademicYear(newYear);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onSetActiveYear(SetActiveYearEvent event, Emitter<SchoolState> emit) async {
    try {
      await repository.setActiveYear(event.id);
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onAddTerm(AddTermEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading, error: null));
    try {
      final newTerm = Term(
        academicYearId: event.academicYearId,
        name: event.name,
        isActive: state.terms.isEmpty,
      );
      await repository.addTerm(newTerm);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onSetActiveTerm(SetActiveTermEvent event, Emitter<SchoolState> emit) async {
    try {
      await repository.setActiveTerm(event.id);
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onAddClass(AddClassEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading, error: null));
    try {
      final newClass = SchoolClass(name: event.name, description: event.description);
      await repository.addClass(newClass);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onDeleteClass(DeleteClassEvent event, Emitter<SchoolState> emit) async {
    try {
      await repository.deleteClass(event.id);
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onAddStudent(AddStudentEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading, error: null));
    try {
      await repository.addStudent(event.student);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onUpdateStudent(UpdateStudentEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading, error: null));
    try {
      await repository.updateStudent(event.student);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onDeleteStudent(DeleteStudentEvent event, Emitter<SchoolState> emit) async {
    try {
      await repository.deleteStudent(event.id);
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onPromoteStudents(PromoteStudentsEvent event, Emitter<SchoolState> emit) async {
    try {
      await repository.promoteStudents(event.studentIds, event.targetClassId);
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onLoadStudentRecords(LoadStudentRecordsEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true));
    try {
      final invoices = await invoiceRepository.getInvoicesByStudentId(event.studentId);
      emit(state.copyWith(studentInvoices: invoices, isLoading: false));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> _onLoadSubjects(LoadSubjectsEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true));
    try {
      final subjects = await repository.getSubjects();
      emit(state.copyWith(subjects: subjects, isLoading: false));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> _onAddSubject(AddSubjectEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading));
    try {
      await repository.addSubject(Subject(name: event.name, code: event.code));
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSubjectsEvent());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onUpdateSubject(UpdateSubjectEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading));
    try {
      await repository.updateSubject(event.subject);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSubjectsEvent());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onDeleteSubject(DeleteSubjectEvent event, Emitter<SchoolState> emit) async {
    try {
      await repository.deleteSubject(event.id);
      add(LoadSubjectsEvent());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onLoadResults(LoadResultsEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true));
    try {
      final results = await repository.getResults(
        studentId: event.studentId,
        classId: event.classId,
        subjectId: event.subjectId,
        termId: event.termId,
        academicYearId: event.academicYearId,
      );
      emit(state.copyWith(results: results, isLoading: false));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> _onSaveResults(SaveResultsEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading));
    try {
      await repository.saveResults(event.results);
      emit(state.copyWith(status: SchoolStatus.success));
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }
}
