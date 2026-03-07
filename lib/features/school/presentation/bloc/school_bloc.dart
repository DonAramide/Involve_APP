import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/school/domain/repositories/school_repository.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/school/domain/entities/grading_rule.dart';
import 'package:involve_app/features/stock/domain/repositories/item_repository.dart';
import 'package:involve_app/features/stock/domain/entities/item.dart';
import 'package:involve_app/features/school/presentation/bloc/school_state.dart';
import 'package:involve_app/features/invoicing/domain/repositories/invoice_repository.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:collection/collection.dart';
import 'package:equatable/equatable.dart';

part 'school_event.dart';

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
    on<UpdateAcademicYearEvent>(_onUpdateAcademicYear);
    on<SetActiveYearEvent>(_onSetActiveYear);
    on<AddTermEvent>(_onAddTerm);
    on<UpdateTermEvent>(_onUpdateTerm);
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

    // Grading Rules
    on<LoadGradingRules>(_onLoadGradingRules);
    on<AddGradingRuleEvent>(_onAddGradingRule);
    on<UpdateGradingRuleEvent>(_onUpdateGradingRule);
    on<DeleteGradingRuleEvent>(_onDeleteGradingRule);

    // Teachers
    on<AddTeacherEvent>(_onAddTeacher);
    on<UpdateTeacherEvent>(_onUpdateTeacher);
    on<DeleteTeacherEvent>(_onDeleteTeacher);

    on<MakeStudentPaymentEvent>(_onMakeStudentPayment);

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
      final subjects = await repository.getSubjects();
      final teachers = await repository.getTeachers();
      
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
        subjects: subjects,
        teachers: teachers,
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
      final newYear = AcademicYear(
        name: event.name, 
        startDate: event.startDate,
        endDate: event.endDate,
        isCurrent: state.academicYears.isEmpty,
      );
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
        startDate: event.startDate,
        endDate: event.endDate,
        isCurrent: state.terms.isEmpty,
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

  Future<void> _onUpdateAcademicYear(UpdateAcademicYearEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading));
    try {
      await repository.updateAcademicYear(event.year);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onUpdateTerm(UpdateTermEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading));
    try {
      await repository.updateTerm(event.term);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSchoolData());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
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
      final results = await repository.getResults(studentId: event.studentId);
      
      // Also refresh the specific student's data to get the latest balance
      final students = await repository.getStudents();
      
      emit(state.copyWith(
        studentInvoices: invoices, 
        results: results,
        students: students,
        isLoading: false
      ));
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
      await repository.addSubject(Subject(name: event.name, code: event.code, teacherId: event.teacherId));
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
      emit(state.copyWith(isLoading: false, status: SchoolStatus.success));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onLoadGradingRules(LoadGradingRules event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true));
    try {
      final rules = await repository.getGradingRules();
      emit(state.copyWith(gradingRules: rules, isLoading: false));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> _onAddGradingRule(AddGradingRuleEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading));
    try {
      await repository.addGradingRule(event.rule);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadGradingRules());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onUpdateGradingRule(UpdateGradingRuleEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading));
    try {
      await repository.updateGradingRule(event.rule);
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadGradingRules());
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onDeleteGradingRule(DeleteGradingRuleEvent event, Emitter<SchoolState> emit) async {
    try {
      await repository.deleteGradingRule(event.id);
      add(LoadGradingRules());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  // Teacher Handlers
  Future<void> _onAddTeacher(AddTeacherEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, error: null, status: SchoolStatus.loading));
    try {
      await repository.addTeacher(event.teacher);
      final teachers = await repository.getTeachers();
      emit(state.copyWith(isLoading: false, teachers: teachers, status: SchoolStatus.success));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onUpdateTeacher(UpdateTeacherEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, error: null, status: SchoolStatus.loading));
    try {
      await repository.updateTeacher(event.teacher);
      final teachers = await repository.getTeachers();
      emit(state.copyWith(isLoading: false, teachers: teachers, status: SchoolStatus.success));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onDeleteTeacher(DeleteTeacherEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, error: null, status: SchoolStatus.loading));
    try {
      await repository.deleteTeacher(event.id);
      final teachers = await repository.getTeachers();
      emit(state.copyWith(isLoading: false, teachers: teachers, status: SchoolStatus.success));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString(), status: SchoolStatus.failure));
    }
  }

  Future<void> _onMakeStudentPayment(MakeStudentPaymentEvent event, Emitter<SchoolState> emit) async {
    emit(state.copyWith(isLoading: true, status: SchoolStatus.loading, error: null));
    try {
      final student = state.students.firstWhere((s) => s.id == event.studentId);
      final newBalance = student.balance - event.amount;
      
      // 1. Update Student Balance
      await repository.updateStudent(student.copyWith(balance: newBalance));
      
      // 2. Generate Payment Receipt Invoice
      final activeTerm = state.terms.where((t) => t.isActive).firstOrNull ?? state.terms.firstOrNull;
      final activeYear = state.academicYears.where((y) => y.isActive).firstOrNull ?? state.academicYears.firstOrNull;
      
      final invoice = Invoice(
        invoiceNumber: 'PMT-${student.admissionNumber ?? student.id}-${DateTime.now().millisecondsSinceEpoch}',
        dateCreated: DateTime.now(),
        items: [
          InvoiceItem(
            item: Item(
              id: -99,
              name: 'School Fees Payment ${event.remarks ?? ""}',
              price: event.amount,
              category: ItemCategory.service,
              type: 'service',
              stockQty: 0,
            ),
            quantity: 1,
            unitPrice: event.amount,
            type: 'service',
          )
        ],
        subtotal: event.amount,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: event.amount,
        paymentStatus: 'Paid',
        amountPaid: event.amount,
        balanceAmount: 0,
        customerName: student.fullName,
        customerPhone: student.parentPhone,
        paymentMethod: event.method,
        businessMode: 'school',
        studentId: student.id,
        classId: student.classId,
        termId: activeTerm?.id,
        academicYearId: activeYear?.id,
      );
      
      await invoiceRepository.saveInvoice(invoice);
      
      emit(state.copyWith(status: SchoolStatus.success));
      add(LoadSchoolData());
      add(LoadStudentRecordsEvent(event.studentId)); // Refresh invoices list
    } catch (e) {
      emit(state.copyWith(error: e.toString(), status: SchoolStatus.failure));
    }
  }
}

